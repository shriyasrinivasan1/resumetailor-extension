/**
 * service_worker.js — Background Service Worker for ResumeTailor AI (MV3)
 *
 * Handles all Claude API calls (CORS access via host_permissions in manifest.json).
 * Content scripts and popup communicate with this worker via chrome.runtime.sendMessage.
 *
 * Message types handled:
 *   STORE_JOB_DATA   → cache the current page's job data in memory
 *   GET_JOB_DATA     → return cached job data
 *   GENERATE_RESUME  → call Claude, return structured resume JSON
 *   PARSE_JOB        → call Claude to parse raw page text into structured job data
 */

import { generateResume, parseJobPosting } from '../ai/claudeClient.js';
import { getSettings } from '../storage/storage.js';

// In-memory job data cache. Cleared when the service worker goes idle.
// Persisted in chrome.storage.local by the Generate screen for cross-session access.
let currentJobData = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ResumeTailor AI] Extension installed/updated.');
});

// ─── Message Router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) return;

  switch (message.type) {
    case 'STORE_JOB_DATA':
      currentJobData = message.payload;
      sendResponse({ success: true });
      break;

    case 'GET_JOB_DATA':
      sendResponse({ success: true, jobData: currentJobData });
      break;

    case 'GENERATE_RESUME':
      // Return true to keep the message channel open while we await the async operation
      handleGenerateResume(message.payload, sendResponse);
      return true;

    case 'PARSE_JOB':
      handleParseJob(message.payload, sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
  }
});

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleGenerateResume({ experiences, jobData }, sendResponse) {
  try {
    const settings = await getSettings();
    // settings.anthropicApiKey overrides the build-time key if the user set one in UI
    const apiKey = settings.anthropicApiKey || undefined;
    const resumeJson = await generateResume(experiences, jobData, apiKey);
    sendResponse({ success: true, resumeJson });
  } catch (err) {
    console.error('[ResumeTailor AI] generateResume error:', err);
    sendResponse({ success: false, error: err.message });
  }
}

async function handleParseJob({ pageText }, sendResponse) {
  try {
    const settings = await getSettings();
    const apiKey = settings.anthropicApiKey || undefined;
    const jobData = await parseJobPosting(pageText, apiKey);
    sendResponse({ success: true, jobData });
  } catch (err) {
    console.error('[ResumeTailor AI] parseJob error:', err);
    sendResponse({ success: false, error: err.message });
  }
}
