// content script running on http://localhost:5000/* to sync credentials to extension storage

function syncSettings() {
  const geminiKey = localStorage.getItem('zeno_key_gemini') || '';
  const activeProvider = localStorage.getItem('zeno_active_provider') || 'gemini';
  const agentMode = localStorage.getItem('zeno_agent_mode') || 'false';

  chrome.runtime.sendMessage({
    action: 'syncSettings',
    geminiKey: geminiKey,
    activeProvider: activeProvider,
    agentMode: agentMode
  });
}

// Initial sync
syncSettings();

// Check for changes periodically (e.g. after editing settings)
setInterval(syncSettings, 2000);

// Listen for disable event from the extension's "Remove Assistant" action
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setAgentModeOff') {
    localStorage.setItem('zeno_agent_mode', 'false');
    
    // Uncheck UI toggle if it exists on the page
    const toggleEl = document.getElementById('agent-mode-toggle');
    if (toggleEl) {
      toggleEl.checked = false;
      toggleEl.dispatchEvent(new Event('change'));
    }
    
    sendResponse({ success: true });
  }
  return true;
});
