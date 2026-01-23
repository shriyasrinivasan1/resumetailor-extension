console.log('ResumeTailor AI background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ResumeTailor AI installed');
});

async function callOpenAI({ apiKey, masterResume, jobTitle, jobDescription }) {
  const systemPrompt =
    "You are ResumeTailor AI, an expert resume rewriter. Given a job posting and the user's master resume, generate a concise, ATS-friendly tailored resume that: (1) focuses tightly on the responsibilities and qualifications in the job posting and uses relevant keywords from it; (2) for product-style roles, emphasizes product thinking, user impact, roadmap ownership, experimentation, data-driven decision making, and cross-functional collaboration; (3) rewrites bullets to highlight problems solved, decisions made, and measurable or qualitative impact rather than low-level implementation details; (4) keeps the resume to approximately one US letter page of content (aim for roughly 600–700 words), with clear sections like Education, Experience, Projects, Leadership, and Skills; and (5) does NOT include any meta commentary, explanations, or notes about the resume (no sentences like 'This resume highlights...' and no long Additional Information sections unless strictly necessary for the role). Always output only the final resume text, nothing else.";

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
