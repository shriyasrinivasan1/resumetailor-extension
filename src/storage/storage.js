/**
 * storage.js — chrome.storage.local helpers for ResumeTailor AI
 *
 * All data lives in chrome.storage.local (10 MB limit, not synced across devices).
 *
 * Storage keys:
 *   "experiences"  → ResumeEntry[]  (all entry types stored in one array)
 *   "history"      → HistoryEntry[]
 *   "settings"     → Settings
 */

// ─── Entry Types (JSDoc) ──────────────────────────────────────────────────────

/**
 * Work Experience
 * @typedef {Object} ExperienceEntry
 * @property {string}   id
 * @property {'experience'} type
 * @property {string}   position      - Job title
 * @property {string}   company
 * @property {string}   location
 * @property {string}   startDate     - "YYYY-MM"
 * @property {string}   endDate       - "YYYY-MM" (ignored when isPresent=true)
 * @property {boolean}  isPresent
 * @property {string[]} skills        - Skills used in this role
 * @property {string[]} achievements  - Bullet points
 */

/**
 * Education
 * @typedef {Object} EducationEntry
 * @property {string}   id
 * @property {'education'} type
 * @property {string}   school
 * @property {string}   location
 * @property {string}   degreeType    - "B.S." | "B.A." | "M.S." | etc.
 * @property {string[]} majors
 * @property {string[]} minors
 * @property {string}   startYear     - "YYYY"
 * @property {string}   gradYear      - "YYYY"
 * @property {boolean}  isExpected    - true if not yet graduated
 */

/**
 * Project
 * @typedef {Object} ProjectEntry
 * @property {string}   id
 * @property {'project'} type
 * @property {string}   name
 * @property {string}   startDate     - "YYYY-MM" (optional)
 * @property {string}   endDate       - "YYYY-MM" (ignored when isOngoing=true)
 * @property {boolean}  isOngoing
 * @property {string[]} bullets       - Description bullets
 */

/**
 * Leadership
 * @typedef {Object} LeadershipEntry
 * @property {string}   id
 * @property {'leadership'} type
 * @property {string}   orgName
 * @property {string}   position
 * @property {string}   startDate     - "YYYY-MM"
 * @property {string}   endDate       - "YYYY-MM" (ignored when isPresent=true)
 * @property {boolean}  isPresent
 * @property {string}   location      - optional
 * @property {string[]} bullets
 */

/**
 * Skills (singleton — only one entry of this type)
 * @typedef {Object} SkillsEntry
 * @property {string}   id
 * @property {'skills'} type
 * @property {string[]} technical
 * @property {string[]} frameworks
 * @property {string[]} databases
 * @property {string[]} devTools
 * @property {string[]} productSkills
 */

/**
 * @typedef {ExperienceEntry|EducationEntry|ProjectEntry|LeadershipEntry|SkillsEntry} ResumeEntry
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} jobTitle
 * @property {string} company
 * @property {string} generatedAt   - ISO date string
 * @property {Object} resumeJson
 */

/**
 * @typedef {Object} Settings
 * @property {string} [anthropicApiKey]
 */

// ─── Low-level Helpers ────────────────────────────────────────────────────────

function get(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result);
    });
  });
}

function set(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Resume Entries CRUD ──────────────────────────────────────────────────────

export async function getExperiences() {
  const { experiences = [] } = await get('experiences');
  return experiences;
}

export async function saveExperience(entry) {
  const experiences = await getExperiences();
  const idx = experiences.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    experiences[idx] = entry;
  } else {
    experiences.push({ ...entry, id: entry.id || generateId() });
  }
  await set({ experiences });
  return experiences;
}

export async function deleteExperience(id) {
  const experiences = await getExperiences();
  const filtered = experiences.filter((e) => e.id !== id);
  await set({ experiences: filtered });
  return filtered;
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory() {
  const { history = [] } = await get('history');
  return history;
}

export async function addHistoryEntry(entry) {
  const history = await getHistory();
  history.unshift({ ...entry, id: generateId(), generatedAt: new Date().toISOString() });
  await set({ history: history.slice(0, 50) });
  return history;
}

export async function deleteHistoryEntry(id) {
  const history = await getHistory();
  const filtered = history.filter((e) => e.id !== id);
  await set({ history: filtered });
  return filtered;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings() {
  const { settings = {} } = await get('settings');
  return settings;
}

export async function saveSettings(patch) {
  const current = await getSettings();
  await set({ settings: { ...current, ...patch } });
}
