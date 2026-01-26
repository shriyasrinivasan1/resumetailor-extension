document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const masterResumeInput = document.getElementById('master-resume');
  const saveButton = document.getElementById('save-settings');
  const generateButton = document.getElementById('generate-resume');
  const regenerateButton = document.getElementById('regenerate-resume');
  const tailoredResumeOutput = document.getElementById('tailored-resume');
  const reasoningOutput = document.getElementById('reasoning-debug');
  const copyButton = document.getElementById('copy-resume');
  const downloadButton = document.getElementById('download-pdf');
  const status = document.getElementById('status');

  if (!apiKeyInput || !masterResumeInput || !saveButton || !generateButton || !regenerateButton || !tailoredResumeOutput || !reasoningOutput || !copyButton || !downloadButton || !status) {
    return;
  }

  let lastJobInfo = null;

  status.textContent = '';

  chrome.storage.sync.get(['openaiApiKey', 'masterResume'], (result) => {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
    if (result.masterResume) {
      masterResumeInput.value = result.masterResume;
    }
  });

  saveButton.addEventListener('click', () => {
    const openaiApiKey = apiKeyInput.value.trim();
    const masterResume = masterResumeInput.value.trim();

    chrome.storage.sync.set({ openaiApiKey, masterResume }, () => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Error saving settings: ' + chrome.runtime.lastError.message;
        return;
      }
      status.textContent = 'Settings saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 2500);
    });
  });

  generateButton.addEventListener('click', () => {
    status.textContent = '';

    const openaiApiKey = apiKeyInput.value.trim();
    const masterResume = masterResumeInput.value.trim();

    if (!openaiApiKey) {
      status.textContent = 'Please enter your OpenAI API key first.';
      return;
    }
    if (!masterResume) {
      status.textContent = 'Please paste your master resume first.';
      return;
    }

    status.textContent = 'Requesting job details from this page...';
    tailoredResumeOutput.value = '';
    reasoningOutput.value = '';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.id) {
        status.textContent = 'Could not find active tab.';
        return;
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { type: 'GET_JOB_INFO' },
        (jobResponse) => {
          if (chrome.runtime.lastError) {
            status.textContent = 'Error talking to page: ' + chrome.runtime.lastError.message;
            return;
          }

          if (!jobResponse || !jobResponse.success) {
            status.textContent = 'No job info returned from page.';
            return;
          }

          const { jobTitle, jobDescription } = jobResponse;
          lastJobInfo = { jobTitle, jobDescription };
          generateWithJobInfo({ jobTitle, jobDescription, openaiApiKey, masterResume });
        }
      );
    });
  });

  function generateWithJobInfo({ jobTitle, jobDescription, openaiApiKey, masterResume }) {
    status.textContent = 'Contacting OpenAI to generate tailored resume...';

    chrome.runtime.sendMessage(
      {
        type: 'GENERATE_TAILORED_RESUME',
        payload: {
          apiKey: openaiApiKey,
          masterResume,
          jobTitle,
          jobDescription,
        },
      },
      (genResponse) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Error from background: ' + chrome.runtime.lastError.message;
          return;
        }

        if (!genResponse || !genResponse.success) {
          status.textContent = 'OpenAI error: ' + (genResponse && genResponse.error ? genResponse.error : 'Unknown error');
          return;
        }

        const raw = genResponse.tailoredResume || '';
        let resumeText = raw.trim();
        let reasoningText = '';

        const resumeMarker = '===RESUME===';
        const reasoningMarker = '===REASONING===';

        const resumeIndex = raw.indexOf(resumeMarker);
        const reasoningIndex = raw.indexOf(reasoningMarker);

        if (resumeIndex !== -1 && reasoningIndex !== -1 && reasoningIndex > resumeIndex) {
          const resumeSection = raw
            .slice(resumeIndex + resumeMarker.length, reasoningIndex)
            .trim();
          const reasoningSection = raw
            .slice(reasoningIndex + reasoningMarker.length)
            .trim();
          resumeText = resumeSection;
          reasoningText = reasoningSection;
        }

        tailoredResumeOutput.value = resumeText;
        reasoningOutput.value = reasoningText;
        status.textContent = 'Tailored resume generated.';
      }
    );
  }

  regenerateButton.addEventListener('click', () => {
    status.textContent = '';

    const openaiApiKey = apiKeyInput.value.trim();
    const masterResume = masterResumeInput.value.trim();

    if (!openaiApiKey) {
      status.textContent = 'Please enter your OpenAI API key first.';
      return;
    }
    if (!masterResume) {
      status.textContent = 'Please paste your master resume first.';
      return;
    }
    if (!lastJobInfo || !lastJobInfo.jobDescription) {
      status.textContent = 'Generate once first to capture job details, then you can regenerate.';
      return;
    }

    tailoredResumeOutput.value = '';
    reasoningOutput.value = '';
    generateWithJobInfo({
      jobTitle: lastJobInfo.jobTitle,
      jobDescription: lastJobInfo.jobDescription,
      openaiApiKey,
      masterResume,
    });
  });

  copyButton.addEventListener('click', async () => {
    const text = tailoredResumeOutput.value;
    if (!text) {
      status.textContent = 'Nothing to copy yet.';
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied tailored resume to clipboard.';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    } catch (err) {
      status.textContent = 'Could not copy to clipboard.';
    }
  });

  downloadButton.addEventListener('click', () => {
    const text = tailoredResumeOutput.value;
    if (!text) {
      status.textContent = 'Nothing to download yet.';
      return;
    }

    const escapeHtml = (str) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // For now we treat the tailored resume text as already grouped by sections.
    // We render it in a Times New Roman, single-column layout tuned for printing.
    const htmlContent = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tailored Resume - ResumeTailor AI</title>
    <style>
      @page {
        size: 8.5in 11in;
        margin: 0.6in;
      }

      body {
        font-family: "Times New Roman", Times, Georgia, serif;
        font-size: 11pt;
        color: #111827;
        margin: 0.6in;
      }

      .resume-container {
        width: 100%;
      }

      .header {
        text-align: center;
        margin-bottom: 8pt;
      }

      .name {
        font-size: 20pt;
        font-weight: bold;
      }

      .contact-line {
        font-size: 10.5pt;
        margin-top: 2pt;
      }

      .section {
        margin-top: 10pt;
      }

      .section-title {
        font-size: 11.5pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 4pt;
      }

      .section-rule {
        border: none;
        border-top: 1px solid #111;
        margin: 0 0 4pt 0;
      }

      .entry {
        margin-bottom: 8pt;
      }

      .entry-row {
        display: flex;
        justify-content: space-between;
      }

      .entry-left {
        font-weight: bold;
      }

      .entry-right {
        text-align: right;
      }

      .entry-subrow {
        display: flex;
        justify-content: space-between;
        font-weight: normal;
      }

      .bullets {
        margin-top: 2pt;
      }

      .bullets ul {
        margin: 0;
        padding-left: 18pt;
      }

      .bullets li {
        margin: 0 0 2pt 0;
      }

      .plain-text {
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div class="resume-container">
      <div class="plain-text">${escapeHtml(text)}</div>
    </div>
  </body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      status.textContent = 'Popup blocked. Allow popups to download as PDF.';
      return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Give the browser a moment to render before printing
    printWindow.focus();
    printWindow.print();
  });
});
