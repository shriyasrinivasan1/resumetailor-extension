document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const masterResumeInput = document.getElementById('master-resume');
  const saveButton = document.getElementById('save-settings');
  const generateButton = document.getElementById('generate-resume');
  const status = document.getElementById('status');

  if (!apiKeyInput || !masterResumeInput || !saveButton || !generateButton || !status) {
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
    status.textContent = 'Requesting job details from this page...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.id) {
        status.textContent = 'Could not find active tab.';
        return;
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { type: 'GET_JOB_INFO' },
        (response) => {
          if (chrome.runtime.lastError) {
            status.textContent = 'Error talking to page: ' + chrome.runtime.lastError.message;
            return;
          }

          if (!response || !response.success) {
            status.textContent = 'No job info returned from page.';
            return;
          }

          const preview = (response.jobDescription || '').slice(0, 200).replace(/\s+/g, ' ');
          status.textContent = `Got job info: "${response.jobTitle || 'Untitled role'}" – preview: ${preview}...`;
        }
      );
    });
  });
});
