/**
 * claudeClient.js — Anthropic Claude API wrapper for ResumeTailor AI
 *
 * Called from the background service worker only (CORS access via host_permissions).
 * API key priority: explicit arg → chrome.storage.local override → build-time embedded key.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const BUILD_TIME_KEY = process.env.ANTHROPIC_API_KEY || '';

// ─── Low-level API Call ───────────────────────────────────────────────────────

async function callClaude(messages, systemPrompt, apiKey) {
  const key = apiKey || BUILD_TIME_KEY;
  if (!key) {
    throw new Error(
      'No Anthropic API key found. Add ANTHROPIC_API_KEY to your .env file and run npm run build.'
    );
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, system: systemPrompt, messages }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const block = data.content?.[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected Claude response format.');
  }
  return block.text.trim();
}

// ─── Resume Generation ────────────────────────────────────────────────────────

const RESUME_SYSTEM_PROMPT = `You are ResumeTailor AI, an expert resume strategist and ATS optimization specialist.

You receive:
1. A job posting (title, company, raw description text)
2. A structured database of the candidate's resume entries

The database entries have these shapes by type:
- "profile":    { fullName, email, phone, linkedin, github }
- "experience": { position, company, location, startDate, endDate, isPresent, skills[], achievements[] }
- "education":  { school, location, degreeType, majors[], minors[], startYear, gradYear, isExpected }
- "project":    { name, startDate, endDate, isOngoing, bullets[] }
- "leadership": { orgName, position, startDate, endDate, isPresent, location, bullets[] }
- "skills":     { technical[], frameworks[], databases[], devTools[], productSkills[] }

Rules:
1. RELEVANCE SCORING: Score every experience, project, and leadership entry against the job description. Use keyword overlap (tech stack, domain, responsibilities) to rank. Only include HIGH-relevance entries.
2. SELECT the top 3–5 experience entries AND top 1–2 project entries most relevant to the job. If an entry shares fewer than 2 meaningful keywords with the job description, omit it.
3. REWRITE each bullet with a strong action verb, quantified impact where possible, ≤20 words. Mirror the exact terminology from the job description wherever truthfully applicable.
4. KEYWORDS: Weave verbatim keywords and phrases from the job description into bullets and skills. ATS systems look for exact matches.
5. NEVER invent or exaggerate anything not in the database.
6. ALWAYS include all education entries.
7. SKILLS: Analyze the job description for required and preferred skills. From the database, include ONLY skills that appear in or are directly relevant to the job description. Reorder sub-arrays so most-relevant skills appear first.
8. OUTPUT valid JSON only — no markdown fences, no text outside the JSON object.
9. FORMAT all month-year dates as "Mon YYYY" (e.g. "May 2025", "Aug 2024"). Use "Present" for current roles.
10. FORMAT education "years" field as "YYYY – Expected YYYY" if isExpected=true, or "YYYY – YYYY" otherwise.

Output JSON schema (use exactly this shape, sections in this order):
{
  "header": {
    "name": "", "email": "", "phone": "", "linkedin": "", "github": ""
  },
  "education": [
    { "degree": "", "institution": "", "location": "", "years": "", "majors": [""], "minors": [""] }
  ],
  "experience": [
    { "title": "", "company": "", "location": "", "startDate": "", "endDate": "", "bullets": [""] }
  ],
  "projects": [
    { "name": "", "date": "", "bullets": [""] }
  ],
  "leadership": [
    { "org": "", "position": "", "startDate": "", "endDate": "", "bullets": [""] }
  ],
  "skills": {
    "technical": [""],
    "frameworks": [""],
    "databases": [""],
    "devTools": [""],
    "productSkills": [""]
  }
}

Omit any section (except header and education) if there are no relevant entries for it.
Omit any skills sub-array if it has no relevant items.`;

/**
 * Generate a tailored resume JSON from the user's DB entries + parsed job data.
 * Retries once with a correction prompt if response is not valid JSON.
 */
export async function generateResume(experiences, jobData, apiKey) {
  const userContent = `Job Title: ${jobData.title || 'Not specified'}
Company: ${jobData.company || 'Not specified'}
Job Description:
${jobData.description || jobData.rawText || '(none provided)'}

Candidate Resume Database (JSON):
${JSON.stringify(experiences, null, 2)}`;

  let raw = await callClaude(
    [{ role: 'user', content: userContent }],
    RESUME_SYSTEM_PROMPT,
    apiKey
  );

  raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const correction = await callClaude(
      [
        { role: 'user', content: userContent },
        { role: 'assistant', content: raw },
        {
          role: 'user',
          content: 'That was not valid JSON. Output ONLY the JSON object — no extra text, no markdown.',
        },
      ],
      RESUME_SYSTEM_PROMPT,
      apiKey
    );
    parsed = JSON.parse(
      correction.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    );
  }

  // Always inject header directly from the profile entry — don't trust Claude to copy it
  const profile = experiences.find(e => e.type === 'profile');
  if (profile) {
    parsed.header = {
      name:     profile.fullName || '',
      email:    profile.email    || '',
      phone:    profile.phone    || '',
      linkedin: profile.linkedin || '',
      github:   profile.github   || '',
    };
  }

  return parsed;
}

// ─── Job Posting Parser (AI fallback) ────────────────────────────────────────

const JOB_PARSE_SYSTEM_PROMPT = `You are a job posting parser. Extract structured data from raw job page text.
Output valid JSON only — no markdown, no prose outside the object.

Schema:
{
  "title": "",
  "company": "",
  "responsibilities": [""],
  "requirements": [""],
  "keywords": [""]
}`;

export async function parseJobPosting(pageText, apiKey) {
  const raw = await callClaude(
    [{ role: 'user', content: `Parse this job posting:\n\n${pageText.slice(0, 12000)}` }],
    JOB_PARSE_SYSTEM_PROMPT,
    apiKey
  );
  return JSON.parse(raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim());
}
