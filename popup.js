document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const masterResumeInput = document.getElementById('master-resume');
  const saveButton = document.getElementById('save-settings');
  const generateButton = document.getElementById('generate-resume');
  const tailoredResumeOutput = document.getElementById('tailored-resume');
  const copyButton = document.getElementById('copy-resume');
  const status = document.getElementById('status');

  if (!apiKeyInput || !masterResumeInput || !saveButton || !generateButton || !tailoredResumeOutput || !copyButton || !status) {
    return;
  }

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

              tailoredResumeOutput.value = genResponse.tailoredResume || '';
              status.textContent = 'Tailored resume generated.';
            }
          );
        }
      );
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
});
