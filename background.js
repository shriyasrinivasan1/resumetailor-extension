console.log('ResumeTailor AI background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ResumeTailor AI installed');
});
