console.log('ResumeTailor AI content script loaded on', window.location.href);

function extractJobInfo() {
  let jobTitle = '';
  let jobDescription = '';

  const titleElement = document.querySelector('h1, h2');
  if (titleElement) {
    jobTitle = titleElement.innerText.trim();
  }

  const bodyText = document.body ? document.body.innerText : '';
  jobDescription = bodyText.trim().slice(0, 8000);

  return { jobTitle, jobDescription };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'GET_JOB_INFO') {
    const info = extractJobInfo();
    sendResponse({ success: true, ...info });
    return true;
  }
});
