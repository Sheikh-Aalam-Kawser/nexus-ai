// Relay messages from the web app to the extension background script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'NEXUS_ENABLE_BLOCKER' || event.data.type === 'NEXUS_DISABLE_BLOCKER') {
    chrome.runtime.sendMessage(event.data);
  }
});
