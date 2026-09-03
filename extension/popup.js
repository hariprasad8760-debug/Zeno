// Popup script for Zeno Extension

const toggle = document.getElementById('agent-toggle');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const agentDesc = document.getElementById('agent-desc');
const openWebBtn = document.getElementById('open-web-btn');

function updateUI(isEnabled) {
  toggle.checked = isEnabled;
  if (isEnabled) {
    statusBadge.style.display = 'inline-flex';
    statusText.textContent = 'Active';
    agentDesc.textContent = 'Visible across all web pages';
  } else {
    statusBadge.style.display = 'inline-flex';
    statusBadge.style.color = '#94a3b8';
    statusBadge.style.background = 'rgba(148, 163, 184, 0.1)';
    statusBadge.style.borderColor = 'rgba(148, 163, 184, 0.2)';
    statusText.textContent = 'Disabled';
    agentDesc.textContent = 'Floating widget is hidden';
  }
}

// 1. Load initial state
chrome.storage.local.get(['agentMode', 'backendUrl'], (data) => {
  const isEnabled = data.agentMode !== 'false';
  updateUI(isEnabled);
});

// 2. Listen for toggle changes
toggle.addEventListener('change', () => {
  const isEnabled = toggle.checked;
  chrome.storage.local.set({ agentMode: isEnabled ? 'true' : 'false' }, () => {
    updateUI(isEnabled);
  });
});

// 3. Open Web App button
openWebBtn.addEventListener('click', () => {
  chrome.storage.local.get(['backendUrl'], (data) => {
    const defaultUrl = 'https://zeno-z94s.onrender.com';
    chrome.tabs.create({ url: defaultUrl });
  });
});
