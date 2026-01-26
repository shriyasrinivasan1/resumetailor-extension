console.log('ResumeTailor AI background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ResumeTailor AI installed');
});

async function callOpenAI({ apiKey, masterResume, jobTitle, jobDescription }) {
  const systemPrompt =
    "You are ResumeTailor AI, an expert resume rewriter. Given a job posting and the user's master resume, generate a concise, ATS-friendly tailored resume that: (1) focuses tightly on the responsibilities and qualifications in the job posting; (2) explicitly identifies important keywords and phrases from the job description and naturally reuses them in the resume wording when, and only when, they truthfully describe the candidate's background; (3) never invents or exaggerates skills, tools, or responsibilities that are not clearly supported by the master resume; (4) aggressively FILTERS the content to only the most relevant experiences, projects, and skills for this specific role, and is allowed to omit or very briefly summarize less relevant roles or projects; (5) for product-style roles, emphasizes product thinking, user impact, roadmap ownership, experimentation, data-driven decision making, and cross-functional collaboration; (6) rewrites bullets to highlight problems solved, decisions made, and measurable or qualitative impact rather than low-level implementation details; (7) keeps the resume to approximately one single-sided US letter page of content, aiming for roughly 300–350 words; (8) uses only standard resume sections such as Education, Experience, Projects, Leadership, and Skills, and MUST NOT include a separate SUMMARY or OBJECTIVE section; (9) includes at most 3 distinct roles in the Experience section, limits each role to at most 2 bullet points, and includes only the 1 most relevant project (or 2 very short project bullets if needed); and (10) does NOT include any meta commentary inside the RESUME text itself (no sentences like 'This resume highlights...' and no long Additional Information sections unless strictly necessary for the role).\n\nAlways respond in exactly two sections separated by markers: first, a '===RESUME===' section containing only the final resume text; second, a '===REASONING===' section explaining in a short, bullet-style format which key phrases or requirements from the job description you targeted and how they map to specific parts of the resume.";

  const userContent = `Role Title: ${jobTitle || 'N/A'}\nAssume this is a product management or product-focused role unless clearly specified otherwise.\n\nYour goal:\n1. Rewrite the resume so it best fits this specific role and company.\n2. Emphasize product skills (user research, experimentation, roadmapping, data analysis, cross-functional collaboration, leadership) where the experience supports it.\n3. Keep technical detail only when it supports product outcomes or matches the job posting.\n4. If the company is in education, learning, or consumer apps, explicitly highlight alignment with their mission and user-centered design.\n\nJob Description:\n${jobDescription}\n\nMaster Resume:\n${masterResume}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices && data.choices[0];
  if (!choice || !choice.message || !choice.message.content) {
    throw new Error('No completion returned from OpenAI.');
  }
  return choice.message.content.trim();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'GENERATE_TAILORED_RESUME') {
    return;
  }

  const { apiKey, masterResume, jobTitle, jobDescription } = message.payload || {};

  (async () => {
    try {
      const tailored = await callOpenAI({ apiKey, masterResume, jobTitle, jobDescription });
      sendResponse({ success: true, tailoredResume: tailored });
    } catch (err) {
      sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  })();

  return true;
});
