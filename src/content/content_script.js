/**
 * content_script.js — Injected into all web pages (runs at document_idle)
 *
 * Responsibilities:
 *   1. Detect whether the current page is a job posting
 *   2. Extract job title, company, and raw page text from the DOM
 *   3. Inject a floating "Tailor Resume" button on job pages
 *   4. Respond to GET_JOB_INFO messages from the popup
 *
 * Step 3 (Job Posting Parser) will layer site-specific selectors on top of this
 * generic extraction to improve accuracy for LinkedIn, Indeed, Greenhouse, etc.
 */

// ─── Job Page Detection ───────────────────────────────────────────────────────

// Known job board URL patterns
const JOB_URL_PATTERNS = [
  /linkedin\.com\/jobs/,
  /indeed\.com\/viewjob/,
  /glassdoor\.com\/job-listing/,
  /lever\.co\//,
  /greenhouse\.io\/jobs/,
  /workday\.com\/.*\/job/,
  /myworkdayjobs\.com/,
  /jobs\.ashbyhq\.com/,
  /boards\.greenhouse\.io/,
  /apply\.workable\.com/,
  /jobs\.lever\.co/,
  /app\.dover\.io/,
];

function isJobPage() {
  const url = window.location.href;
  if (JOB_URL_PATTERNS.some((p) => p.test(url))) return true;

  // Heuristic fallback: page has both an "apply" call-to-action and job section headings
  const bodyText = document.body?.innerText?.slice(0, 4000) || '';
  return (
    /apply (now|for this (role|position|job))/i.test(bodyText) &&
    /(job description|responsibilities|requirements|qualifications)/i.test(bodyText)
  );
}

// ─── Job Data Extraction ──────────────────────────────────────────────────────

function extractJobData() {
  // Attempt a best-effort title extraction from common selectors
  const titleEl = document.querySelector(
    'h1, [class*="job-title"], [data-testid*="job-title"], [class*="jobTitle"]'
  );
  const title = titleEl?.innerText?.trim() || document.title || '';

  // Raw full-page text — Claude will segment it during PARSE_JOB if needed
  const rawText = document.body?.innerText?.trim().slice(0, 12000) || '';

  return { title, rawText, url: window.location.href };
}

// ─── Floating Button ──────────────────────────────────────────────────────────

function injectFloatingButton() {
  if (document.getElementById('rt-generate-btn')) return; // already injected

  const btn = document.createElement('button');
  btn.id = 'rt-generate-btn';
  btn.textContent = '✦ Tailor Resume';

  // Inline styles to avoid conflicts with host page CSS
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    padding: '10px 20px',
    background: '#1a73e8',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    transition: 'background 0.15s, transform 0.1s',
    letterSpacing: '0.01em',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#1557b0';
    btn.style.transform = 'scale(1.02)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#1a73e8';
    btn.style.transform = 'scale(1)';
  });

  btn.addEventListener('click', () => {
    const jobData = extractJobData();

    // Send job data to the background service worker for caching
    chrome.runtime.sendMessage({ type: 'STORE_JOB_DATA', payload: jobData }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[ResumeTailor AI] Could not reach background:', chrome.runtime.lastError);
        return;
      }
      // Feedback — MV3 prevents opening the popup programmatically
      btn.textContent = '✓ Captured — open the popup!';
      btn.style.background = '#188038';
      setTimeout(() => {
        btn.textContent = '✦ Tailor Resume';
        btn.style.background = '#1a73e8';
      }, 3000);
    });
  });

  document.body.appendChild(btn);
}

// ─── Message Listener (popup → content script) ────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_JOB_INFO') {
    sendResponse({ success: true, ...extractJobData() });
    return true;
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

// Always inject the button — the user knows when they're on a job page.
// isJobPage() is still available for future use (e.g. auto-parsing).
injectFloatingButton();
