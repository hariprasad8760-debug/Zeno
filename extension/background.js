// Background Service Worker for Zeno Extension

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
      geminiKey: request.geminiKey,
      activeProvider: request.activeProvider,
      agentMode: request.agentMode
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.local.get(['geminiKey', 'activeProvider', 'agentMode'], (data) => {
      sendResponse({
        geminiKey: data.geminiKey || '',
        activeProvider: data.activeProvider || 'gemini',
        agentMode: data.agentMode || 'false'
      });
    });
    return true;
  }

  if (request.action === 'turnOffAgentMode') {
    // 1. Persist turnoff state in local storage
    chrome.storage.local.set({ agentMode: 'false' }, () => {
      // 2. Notify all localhost client tabs to toggle off agent checkbox
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.url && (tab.url.startsWith('http://localhost:5000') || tab.url.startsWith('http://127.0.0.1:5000'))) {
            chrome.tabs.sendMessage(tab.id, { action: 'setAgentModeOff' }, () => {
              // Ignore potential errors if tab is closing or not fully loaded
              if (chrome.runtime.lastError) { /* ignore */ }
            });
          }
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'chat') {
    // Proxy request to the local Zeno backend to avoid page CSP restrictions
    const { message, mode, provider, apiKey, chatHistory, imageBase64 } = request.data;
    
    fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, mode, provider, apiKey, chatHistory, imageBase64 })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Chat request failed');
      }
      return res.json();
    })
    .then((data) => {
      sendResponse({ success: true, data });
    })
    .catch((err) => {
      sendResponse({ success: false, error: err.message });
    });

    return true;
  }
});
