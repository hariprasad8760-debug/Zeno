// Content script running on Zeno web app (localhost, Vercel, Render, custom domains)
// to sync credentials, backend URL, and announce extension presence

let confirmedZenoApp = false;

function isZenoWebApp() {
  if (confirmedZenoApp) return true;
  if (
    document.querySelector('meta[name="zeno-app"]') ||
    document.getElementById('agent-mode-toggle') ||
    document.querySelector('.agent-mode-panel') ||
    document.querySelector('.zeno-app-wrapper') ||
    document.documentElement.dataset.zenoApp === 'true' ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ||
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('onrender.com') ||
    (document.title && document.title.toLowerCase().includes('zeno'))
  ) {
    confirmedZenoApp = true;
    return true;
  }
  return false;
}

function announcePresence() {
  if (!isZenoWebApp()) return;
  document.documentElement.dataset.zenoExtension = "installed";
  window.__ZENO_EXTENSION_INSTALLED__ = true;
  
  try {
    window.postMessage({ source: 'zeno-extension', type: 'ZENO_EXTENSION_PONG', version: '1.0' }, '*');
    document.dispatchEvent(new CustomEvent('zeno:pong-extension', { detail: { version: '1.0' } }));
    document.dispatchEvent(new CustomEvent('zeno-extension-ready', { detail: { version: '1.0' } }));
  } catch (e) {}
}

function syncSettings() {
  if (!isZenoWebApp()) return;
  const geminiKey = localStorage.getItem('zeno_key_gemini') || '';
  const activeProvider = localStorage.getItem('zeno_active_provider') || 'gemini';
  const agentMode = localStorage.getItem('zeno_agent_mode') || 'false';
  const backendUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://zeno-z94s.onrender.com/api';

  try {
    chrome.runtime.sendMessage({
      action: 'syncSettings',
      geminiKey: geminiKey,
      activeProvider: activeProvider,
      agentMode: agentMode,
      backendUrl: backendUrl
    });
  } catch (e) {}
}

// Initial presence announcement & sync
announcePresence();
syncSettings();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    announcePresence();
    syncSettings();
  });
}

// Listen for website ping or sync message
window.addEventListener('message', (event) => {
  if (event.data && (
    event.data.source === 'zeno-web' ||
    event.data.type === 'ZENO_EXTENSION_PING' ||
    event.data.type === 'ZENO_PING_EXTENSION' ||
    event.data.type === 'ZENO_SYNC_SETTINGS'
  )) {
    confirmedZenoApp = true;
    announcePresence();
    syncSettings();
  }
});

// Periodic sync (e.g. after editing settings or toggling Agent Mode)
setInterval(() => {
  announcePresence();
  syncSettings();
}, 1000);

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
