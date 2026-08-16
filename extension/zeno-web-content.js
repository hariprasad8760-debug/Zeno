// content script running on Zeno web app (localhost:3000, localhost:5000) to sync credentials and announce extension presence

function announcePresence() {
  document.documentElement.dataset.zenoExtension = "installed";
  window.__ZENO_EXTENSION_INSTALLED__ = true;
  
  try {
    window.postMessage({ source: 'zeno-extension', type: 'ZENO_EXTENSION_PONG', version: '1.0' }, '*');
    document.dispatchEvent(new CustomEvent('zeno:pong-extension', { detail: { version: '1.0' } }));
    document.dispatchEvent(new CustomEvent('zeno-extension-ready', { detail: { version: '1.0' } }));
  } catch (e) {}
}

function syncSettings() {
  const geminiKey = localStorage.getItem('zeno_key_gemini') || '';
  const activeProvider = localStorage.getItem('zeno_active_provider') || 'gemini';
  const agentMode = localStorage.getItem('zeno_agent_mode') || 'false';

  try {
    chrome.runtime.sendMessage({
      action: 'syncSettings',
      geminiKey: geminiKey,
      activeProvider: activeProvider,
      agentMode: agentMode
    });
  } catch (e) {}
}

// Initial presence announcement & sync
announcePresence();
syncSettings();

// Listen for website ping message
window.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'ZENO_EXTENSION_PING' || event.data.type === 'ZENO_PING_EXTENSION')) {
    announcePresence();
  }
});

// Periodic sync (e.g. after editing settings)
setInterval(() => {
  announcePresence();
  syncSettings();
}, 1500);

// Listen for disable event from the extension's "Remove Assistant" action
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setAgentModeOff') {
    localStorage.setItem('zeno_agent_mode', 'false');
    
    // Uncheck UI toggle on Zeno web page if it exists
    if (window.ZenoAgentMode) {
      window.ZenoAgentMode.disable();
    } else {
      const toggleEl = document.getElementById('agent-mode-toggle');
      if (toggleEl) {
        toggleEl.checked = false;
        toggleEl.dispatchEvent(new Event('change'));
      }
    }
    
    sendResponse({ success: true });
  }
  return true;
});
