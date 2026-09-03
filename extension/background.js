// Background Service Worker for Zeno Extension

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    agentMode: 'true',
    backendUrl: 'https://zeno-z94s.onrender.com/api',
    activeProvider: 'gemini'
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'syncSettings') {
    chrome.storage.local.set({
      geminiKey: request.geminiKey || '',
      activeProvider: request.activeProvider || 'gemini',
      agentMode: request.agentMode || 'false',
      backendUrl: request.backendUrl || 'https://zeno-z94s.onrender.com/api'
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.local.get(['geminiKey', 'activeProvider', 'agentMode', 'backendUrl'], (data) => {
      sendResponse({
        geminiKey: data.geminiKey || '',
        activeProvider: data.activeProvider || 'gemini',
        agentMode: data.agentMode || 'false',
        backendUrl: data.backendUrl || 'https://zeno-z94s.onrender.com/api'
      });
    });
    return true;
  }

  if (request.action === 'turnOffAgentMode') {
    // 1. Persist turnoff state in local storage
    chrome.storage.local.set({ agentMode: 'false' }, () => {
      // 2. Notify all open tabs to toggle off agent mode
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { action: 'setAgentModeOff' }, () => {
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'chat') {
    // Proxy request to the Zeno backend (Render production or local)
    const { message, mode, provider, apiKey, chatHistory, imageBase64 } = request.data;
    
    chrome.storage.local.get(['backendUrl'], (storage) => {
      const apiBase = storage.backendUrl || 'https://zeno-z94s.onrender.com/api';
      const chatEndpoint = apiBase.endsWith('/chat') ? apiBase : `${apiBase.replace(/\/+$/, '')}/chat`;
      
      fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, mode, provider: provider || 'gemini', apiKey, chatHistory, imageBase64 })
      })
      .then(async (res) => {
        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (e) {}
        if (!res.ok) {
          throw new Error(data.error || data.message || `Chat request failed with status ${res.status}`);
        }
        return data;
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    });

    return true;
  }
});
