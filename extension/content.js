// Content script running on all webpages to inject the floating assistant widget

(function() {
  // Prevent duplicate injections or injecting into the Zeno web application itself
  if (
    document.getElementById('zeno-floating-assistant-root') ||
    document.getElementById('agent-mode-toggle') ||
    document.querySelector('.agent-mode-panel') ||
    document.querySelector('.zeno-app-wrapper') ||
    document.documentElement.dataset.zenoApp === 'true'
  ) return;

  // 1. Create a Shadow DOM container to isolate styles from the parent website
  const root = document.createElement('div');
  root.id = 'zeno-floating-assistant-root';
  root.style.position = 'fixed';
  root.style.zIndex = '2147483647';
  document.body.appendChild(root);

  const shadow = root.attachShadow({ mode: 'open' });

  // 2. Inject CSS rules into the shadow DOM
  const styleLink = document.createElement('style');
  styleLink.textContent = `
    :host {
      --accent-color: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.4);
      --shadow-glow: 0 0 10px rgba(99, 102, 241, 0.4);
    }
    * {
      box-sizing: border-box;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    /* Floating agent container — wraps rings + button */
    .floating-agent-container {
      position: fixed;
      right: 24px;
      bottom: 24px;
      display: none;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      z-index: 2147483647;
      transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .floating-agent-container.zeno-hidden {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.6);
    }

    .floating-agent-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.85);
      border: 1.5px solid var(--accent-color);
      color: var(--accent-color);
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s;
      animation: float-wave-move 3s ease-in-out infinite;
      user-select: none;
      touch-action: none;
    }
    .floating-agent-btn:active {
      cursor: grabbing;
      transform: scale(0.94);
    }
    .floating-agent-btn:hover {
      transform: scale(1.12);
      box-shadow: var(--shadow-glow), 0 4px 16px rgba(0,0,0,0.3);
    }
    .floating-agent-btn.dragging {
      cursor: grabbing;
      opacity: 0.85;
      transform: scale(0.97);
      animation-play-state: paused;
      box-shadow: 0 8px 30px rgba(99,102,241,0.3);
    }

    .agent-logo-img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      clip-path: circle(50% at 50% 50%);
      object-fit: cover;
      pointer-events: none;
      animation: logo-float 2.8s ease-in-out infinite alternate;
    }

    /* 3 concentric wave ripple rings */
    .float-wave-ring {
      position: absolute;
      border-radius: 50%;
      border: 1.5px solid var(--accent-color);
      pointer-events: none;
      opacity: 0;
      width: 36px;
      height: 36px;
      bottom: 0;
      right: 0;
    }
    .float-wave-ring-1 { animation: float-ring-wave 2.5s ease-out infinite; }
    .float-wave-ring-2 { animation: float-ring-wave 2.5s ease-out infinite 0.8s; }
    .float-wave-ring-3 { animation: float-ring-wave 2.5s ease-out infinite 1.6s; }

    @keyframes float-ring-wave {
      0%   { transform: scale(1);    opacity: 0.6; }
      70%  { transform: scale(2.2);  opacity: 0.15; }
      100% { transform: scale(2.6);  opacity: 0; }
    }

    @keyframes float-wave-move {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }

    @keyframes logo-float {
      0%   { transform: translateY(0px) scale(1); }
      50%  { transform: translateY(-8px) scale(1.02); }
      100% { transform: translateY(-4px) scale(1.01); }
    }

    /* Menu container popup styling */
    .floating-menu {
      position: fixed;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 6px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.15);
      display: none;
      flex-direction: column;
      gap: 4px;
      z-index: 2147483647;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      width: 190px;
      animation: menuFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes menuFadeIn {
      from { opacity: 0; transform: translateY(8px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.9rem;
      font-weight: 500;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }
    .menu-item:hover {
      background: rgba(99, 102, 241, 0.15);
      color: #fff;
      padding-left: 18px;
    }

    /* Right side panels layout */
    .zeno-panel {
      position: fixed;
      top: 20px;
      right: -420px;
      width: 380px;
      height: calc(100vh - 40px);
      background: rgba(10, 10, 12, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.05);
      z-index: 2147483647;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #fff;
      transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .zeno-panel.open {
      right: 20px;
    }
    
    .panel-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.01);
    }
    .header-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5));
    }
    .header-title {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .close-panel-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 1.1rem;
      cursor: pointer;
      transition: color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
    }
    .close-panel-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }

    /* Content and chats flow wrapper */
    .panel-body {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Input textboxes options */
    .prompt-container {
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .textarea-wrapper {
      position: relative;
      width: 100%;
    }
    .prompt-textarea {
      width: 100%;
      height: 90px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #fff;
      padding: 12px;
      font-size: 0.88rem;
      resize: none;
      outline: none;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .prompt-textarea:focus {
      border-color: rgba(99, 102, 241, 0.5);
      background: rgba(255, 255, 255, 0.05);
    }
    
    .screenshot-preview {
      display: none;
      position: relative;
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 8px;
    }
    .screenshot-preview img {
      width: 100%;
      max-height: 120px;
      object-fit: cover;
    }
    .remove-screenshot-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.6);
      border: none;
      color: #fff;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.8rem;
      transition: background 0.2s;
    }
    .remove-screenshot-btn:hover {
      background: rgba(239, 68, 68, 0.8);
    }

    .prompt-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .panel-btn {
      padding: 8px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .panel-btn.secondary {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.7);
    }
    .panel-btn.secondary:hover {
      border-color: rgba(255, 255, 255, 0.25);
      color: #fff;
      background: rgba(255, 255, 255, 0.02);
    }
    .panel-btn.primary {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.5);
      color: #c7d2fe;
    }
    .panel-btn.primary:hover {
      background: rgba(99, 102, 241, 0.8);
      color: #fff;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
    }
    
    /* Message bubble styling */
    .msg-bubble {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 88%;
      animation: msgFade 0.3s ease forwards;
    }
    @keyframes msgFade {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .msg-bubble.user {
      align-self: flex-end;
    }
    .msg-bubble.assistant {
      align-self: flex-start;
      width: 100%;
    }
    .bubble-inner {
      padding: 12px 14px;
      border-radius: 14px;
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .msg-bubble.user .bubble-inner {
      background: rgba(99, 102, 241, 0.18);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #e0e7ff;
      border-bottom-right-radius: 4px;
    }
    .msg-bubble.assistant .bubble-inner {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #f1f5f9;
      border-bottom-left-radius: 4px;
      width: 100%;
    }
    
    /* Markdown and syntax colors within shadow DOM */
    .bubble-inner p { margin: 0 0 10px 0; }
    .bubble-inner p:last-child { margin-bottom: 0; }
    .bubble-inner code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 5px;
      border-radius: 4px;
      color: #f472b6;
    }
    .bubble-inner pre {
      margin: 12px 0;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 10px;
      overflow-x: auto;
      position: relative;
    }
    .bubble-inner pre code {
      background: transparent;
      padding: 0;
      color: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
    }
    
    .msg-actions {
      display: flex;
      gap: 12px;
      margin-top: 6px;
      padding-left: 4px;
    }
    .msg-action-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .msg-action-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .msg-action-btn svg {
      width: 12px;
      height: 12px;
    }

    .code-copy-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.5);
      padding: 4px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .code-copy-btn:hover {
      background: rgba(99, 102, 241, 0.2);
      color: #fff;
      border-color: rgba(99, 102, 241, 0.4);
    }
    .code-copy-btn svg {
      width: 12px;
      height: 12px;
    }
    
    /* Typing indicator animation */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      width: fit-content;
      align-self: flex-start;
      margin-top: 4px;
    }
    .typing-dot {
      width: 6px;
      height: 6px;
      background: rgba(99, 102, 241, 0.8);
      border-radius: 50%;
      animation: dotPulse 1.4s infinite ease-in-out;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotPulse {
      0%, 100% { transform: scale(0.6); opacity: 0.4; }
      50% { transform: scale(1.2); opacity: 1; }
    }

    /* Warning missing key configurations styling */
    .warning-card {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      color: #fca5a5;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin: auto 0;
    }
    .warning-text {
      font-size: 0.85rem;
      line-height: 1.4;
      font-weight: 500;
    }
  `;
  shadow.appendChild(styleLink);

  // 3. Inject highlight theme CSS from extension resources
  const highlightThemeLink = document.createElement('link');
  highlightThemeLink.rel = 'stylesheet';
  highlightThemeLink.href = chrome.runtime.getURL('lib/github-dark.min.css');
  shadow.appendChild(highlightThemeLink);

  // 4. Create floating agent container with rings and button
  const container = document.createElement('div');
  container.className = 'floating-agent-container';

  const btn = document.createElement('button');
  btn.className = 'floating-agent-btn';

  // 3 concentric rings
  const ring1 = document.createElement('div');
  ring1.className = 'float-wave-ring float-wave-ring-1';
  const ring2 = document.createElement('div');
  ring2.className = 'float-wave-ring float-wave-ring-2';
  const ring3 = document.createElement('div');
  ring3.className = 'float-wave-ring float-wave-ring-3';

  // logo image inside button
  const logoImg = document.createElement('img');
  logoImg.className = 'agent-logo-img';
  logoImg.src = chrome.runtime.getURL('brain_logo.png');
  logoImg.alt = 'Zeno';
  btn.appendChild(logoImg);

  // Append rings and button to container
  container.appendChild(ring1);
  container.appendChild(ring2);
  container.appendChild(ring3);
  container.appendChild(btn);
  shadow.appendChild(container);

  // 5. Create circular float options popup menu
  const floatingMenu = document.createElement('div');
  floatingMenu.className = 'floating-menu';
  floatingMenu.innerHTML = `
    <button class="menu-item" id="menu-clipboard">
      <span>📋</span> Analyze Clipboard
    </button>
    <button class="menu-item" id="menu-screenshot">
      <span>📸</span> Analyze Screenshot
    </button>
    <button class="menu-item" id="menu-remove" style="border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 4px; padding-top: 8px; color: #f87171;">
      <span>❌</span> Remove Assistant
    </button>
  `;
  shadow.appendChild(floatingMenu);

  // 6. Create right chat companion panel
  const panel = document.createElement('div');
  panel.className = 'zeno-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <div class="header-title-row">
        <img src="${chrome.runtime.getURL('brain_logo.png')}" class="header-logo" alt="Zeno Logo">
        <span class="header-title">ZENO AI</span>
      </div>
      <button class="close-panel-btn" id="close-panel-btn">❌</button>
    </div>
    <div class="panel-body" id="panel-chat-body"></div>
    <div class="prompt-container">
      <div class="screenshot-preview" id="screenshot-preview-wrap">
        <img id="screenshot-preview-img" src="" alt="preview">
        <button class="remove-screenshot-btn" id="remove-screenshot-btn">×</button>
      </div>
      <div class="textarea-wrapper">
        <textarea class="prompt-textarea" id="prompt-textarea" placeholder="Paste your code, error, log or text..."></textarea>
      </div>
      <div class="prompt-footer">
        <button class="panel-btn secondary" id="stop-btn" style="display:none;">Stop</button>
        <button class="panel-btn primary" id="send-btn">Send</button>
      </div>
    </div>
  `;
  shadow.appendChild(panel);

  // 7. Get references to DOM elements in the shadow DOM
  const chatBody = shadow.getElementById('panel-chat-body');
  const textarea = shadow.getElementById('prompt-textarea');
  const sendBtn = shadow.getElementById('send-btn');
  const stopBtn = shadow.getElementById('stop-btn');
  const screenshotPreviewWrap = shadow.getElementById('screenshot-preview-wrap');
  const screenshotPreviewImg = shadow.getElementById('screenshot-preview-img');
  const removeScreenshotBtn = shadow.getElementById('remove-screenshot-btn');
  
  let currentImageBase64 = null;
  let activeRequestController = null;
  let chatHistory = [];

  // ── Drag state ───────────────────────────────────────────────────────────────
  let isDragging   = false;
  let didDrag      = false;  // true if mouse moved enough to count as drag
  let dragOffsetX  = 0;      // cursor offset from container top-left
  let dragOffsetY  = 0;

  // Always clear zenoHidden on load — button starts visible every time
  chrome.storage.local.remove('zenoHidden');

  // Convert stored position to left/top and restore
  chrome.storage.local.get(['btnLeft', 'btnTop'], (stored) => {
    const margin = 10;
    const cw = container.offsetWidth  || 56;
    const ch = container.offsetHeight || 56;

    if (stored.btnLeft !== undefined && stored.btnTop !== undefined) {
      // Use stored left/top directly
      const left = Math.max(margin, Math.min(window.innerWidth  - cw  - margin, parseInt(stored.btnLeft)));
      const top  = Math.max(margin, Math.min(window.innerHeight - ch  - margin, parseInt(stored.btnTop)));
      container.style.left   = `${left}px`;
      container.style.top    = `${top}px`;
      container.style.right  = 'auto';
      container.style.bottom = 'auto';
    }
  });

  // ── Mouse drag ───────────────────────────────────────────────────────────────
  btn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    didDrag = false;
    isDragging = true;

    const rect = container.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    didDrag = true;
    btn.classList.add('dragging');

    const margin = 10;
    const cw = container.offsetWidth  || 56;
    const ch = container.offsetHeight || 56;

    let left = e.clientX - dragOffsetX;
    let top  = e.clientY - dragOffsetY;

    left = Math.max(margin, Math.min(window.innerWidth  - cw  - margin, left));
    top  = Math.max(margin, Math.min(window.innerHeight - ch  - margin, top));

    container.style.left   = `${left}px`;
    container.style.top    = `${top}px`;
    container.style.right  = 'auto';
    container.style.bottom = 'auto';
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
    isDragging = false;
    btn.classList.remove('dragging');

    if (didDrag) {
      // Persist new position as left/top
      chrome.storage.local.set({
        btnLeft: container.style.left,
        btnTop:  container.style.top
      });
      // Prevent accidental click after drag
      setTimeout(() => { didDrag = false; }, 80);
    }
  }

  // ── Ctrl+Shift+R — toggle floating button visibility ─────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyR') {
      e.preventDefault();
      const nowHidden = container.classList.toggle('zeno-hidden');
      if (nowHidden) {
        floatingMenu.style.display = 'none';
        panel.classList.remove('open');
      }
      // Persist toggle state so it survives page reloads
      chrome.storage.local.remove('zenoHidden');
    }
  });

  // Handle click on floating button
  btn.addEventListener('click', (e) => {
    if (didDrag) return;
    e.stopPropagation();
    
    // Toggle options menu position near the floating button
    const btnRect = btn.getBoundingClientRect();
    const menuRight = window.innerWidth - btnRect.right;
    const menuBottom = window.innerHeight - btnRect.top + 8;

    floatingMenu.style.right = `${menuRight}px`;
    floatingMenu.style.bottom = `${menuBottom}px`;
    floatingMenu.style.left = 'auto'; // Clear left if set
    floatingMenu.style.top = 'auto';
    floatingMenu.style.display = floatingMenu.style.display === 'flex' ? 'none' : 'flex';
  });

  // Close menu popup when clicking outside the menu
  document.addEventListener('click', (e) => {
    // Check if click originates from inside Shadow DOM
    const path = e.composedPath();
    if (!path.includes(btn) && !path.includes(floatingMenu)) {
      floatingMenu.style.display = 'none';
    }
  });

  // Open companion panels
  shadow.getElementById('menu-clipboard').addEventListener('click', () => {
    floatingMenu.style.display = 'none';
    panel.classList.add('open');
    textarea.focus();
  });

  shadow.getElementById('close-panel-btn').addEventListener('click', () => {
    panel.classList.remove('open');
  });

  // Remove Assistant button click handler
  shadow.getElementById('menu-remove').addEventListener('click', () => {
    floatingMenu.style.display = 'none';
    container.style.display = 'none';
    panel.classList.remove('open');
    
    // Automatically turn off agent mode on open localhost website tabs
    chrome.runtime.sendMessage({ action: 'turnOffAgentMode' });
  });

  // Dynamically sync agentMode state from storage
  chrome.storage.local.get(['agentMode'], (data) => {
    if (data && (data.agentMode === 'true' || data.agentMode === true)) {
      container.style.display = 'flex';
    } else {
      container.style.display = 'none';
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.agentMode) {
      if (changes.agentMode.newValue === 'true' || changes.agentMode.newValue === true) {
        container.style.display = 'flex';
      } else {
        container.style.display = 'none';
        floatingMenu.style.display = 'none';
        panel.classList.remove('open');
      }
    }
  });

  // 8. Screenshot Capture & Selection Area overlay
  shadow.getElementById('menu-screenshot').addEventListener('click', () => {
    floatingMenu.style.display = 'none';
    startScreenshotSelection();
  });

  function startScreenshotSelection() {
    // Create drawing layer overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.4)';
    overlay.style.zIndex = '2147483647';
    overlay.style.cursor = 'crosshair';
    document.body.appendChild(overlay);

    const selectionBox = document.createElement('div');
    selectionBox.style.position = 'absolute';
    selectionBox.style.border = '2px solid #6366f1';
    selectionBox.style.background = 'rgba(99, 102, 241, 0.12)';
    selectionBox.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.4)';
    selectionBox.style.display = 'none';
    overlay.appendChild(selectionBox);

    let startX = 0;
    let startY = 0;
    let isDrawing = false;

    overlay.addEventListener('mousedown', (e) => {
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      selectionBox.style.display = 'block';
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(currentX, startX);
      const top = Math.min(currentY, startY);

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    });

    overlay.addEventListener('mouseup', () => {
      if (!isDrawing) return;
      isDrawing = false;
      
      const boxRect = selectionBox.getBoundingClientRect();
      document.body.removeChild(overlay);

      if (boxRect.width < 5 || boxRect.height < 5) return; // avoid tiny accidental drag clicks

      // Ask extension background script to capture screen visible area
      chrome.runtime.sendMessage({ action: 'captureTab' }, (response) => {
        if (!response || response.error) {
          alert('Screen capture failed: ' + (response ? response.error : 'unknown background state'));
          return;
        }

        cropCapturedImage(response.dataUrl, boxRect);
      });
    });
  }

  function cropCapturedImage(dataUrl, cropRect) {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Adjust for device pixel ratio
      const dpr = window.devicePixelRatio || 1;
      canvas.width = cropRect.width * dpr;
      canvas.height = cropRect.height * dpr;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the cropped region
      ctx.drawImage(
        img,
        cropRect.left * dpr,
        cropRect.top * dpr,
        cropRect.width * dpr,
        cropRect.height * dpr,
        0,
        0,
        cropRect.width * dpr,
        cropRect.height * dpr
      );

      // Convert cropped canvas back to Base64
      const croppedBase64 = canvas.toDataURL('image/png');
      currentImageBase64 = croppedBase64.replace(/^data:image\/png;base64,/, '');

      // Update image visual preview in prompt area
      screenshotPreviewImg.src = croppedBase64;
      screenshotPreviewWrap.style.display = 'block';
      panel.classList.add('open');
      textarea.focus();
    };
  }

  removeScreenshotBtn.addEventListener('click', () => {
    currentImageBase64 = null;
    screenshotPreviewWrap.style.display = 'none';
  });

  // 9. Send logic and Gemini integration
  sendBtn.addEventListener('click', handleSend);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  stopBtn.addEventListener('click', () => {
    if (activeRequestController) {
      activeRequestController.abort();
      activeRequestController = null;
    }
    // Remove typing indicators
    const loading = chatBody.querySelector('.typing-indicator');
    if (loading) chatBody.removeChild(loading);
    stopBtn.style.display = 'none';
    sendBtn.style.display = 'block';
  });

  function handleSend() {
    const text = textarea.value.trim();
    if (!text && !currentImageBase64) return;

    // Cache the image payload before clearing inputs
    const imageToSend = currentImageBase64;

    // Retrieve synced API keys first
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
      const geminiKey = settings ? settings.geminiKey : '';

      // Render user request bubble
      appendMessage('user', text, imageToSend ? screenshotPreviewImg.src : null);
      
      // Clear inputs
      textarea.value = '';
      currentImageBase64 = null;
      screenshotPreviewWrap.style.display = 'none';

      // Add typing indicator
      const typingIndicator = appendTypingIndicator();

      // Show stop button during generation
      sendBtn.style.display = 'none';
      stopBtn.style.display = 'block';

      // Call background worker to proxy /api/chat call
      activeRequestController = {
        abort: () => {
          aborted = true;
        }
      };
      let aborted = false;

      chrome.runtime.sendMessage({
        action: 'chat',
        data: {
          message: text,
          mode: 'chat',
          provider: 'gemini',
          apiKey: geminiKey,
          chatHistory: chatHistory,
          imageBase64: imageToSend
        }
      }, (response) => {
        if (aborted) return;

        // Remove loading dots
        if (typingIndicator.parentNode) {
          chatBody.removeChild(typingIndicator);
        }
        sendBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        activeRequestController = null;

        if (!response || !response.success) {
          const errorMsg = response ? response.error : 'Failed to connect to local Zeno backend.';
          appendMessage('assistant', `⚠️ **Error:** ${errorMsg}`);
          return;
        }

        const aiResponseText = response.data.response;
        
        // Append response to history
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: aiResponseText });

        appendMessage('assistant', aiResponseText);
      });
    });
  }

  function appendMessage(role, content, imageUrl = null) {
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${role}`;

    const inner = document.createElement('div');
    inner.className = 'bubble-inner';
    
    if (role === 'user') {
      const textNode = document.createElement('p');
      textNode.textContent = content;
      inner.appendChild(textNode);

      if (imageUrl) {
        const imgWrap = document.createElement('div');
        imgWrap.style.marginTop = '8px';
        imgWrap.style.borderRadius = '6px';
        imgWrap.style.overflow = 'hidden';
        imgWrap.innerHTML = `<img src="${imageUrl}" style="max-width:100%;max-height:160px;object-fit:cover;">`;
        inner.appendChild(imgWrap);
      }
    } else {
      // Parse markdown with marked (checking global marked, window.marked, or self.marked)
      let parsedContent = content ? String(content).replace(/\$4\//g, '') : '';
      let rawHtml = '';

      const markedFn = (typeof marked !== 'undefined' ? marked : (window.marked || self.marked));
      const purifyFn = (typeof DOMPurify !== 'undefined' ? DOMPurify : (window.DOMPurify || self.DOMPurify));

      if (markedFn && typeof markedFn.parse === 'function') {
        rawHtml = markedFn.parse(parsedContent);
      } else {
        rawHtml = formatBasicMarkdown(parsedContent);
      }

      if (purifyFn && typeof purifyFn.sanitize === 'function') {
        rawHtml = purifyFn.sanitize(rawHtml);
      }
      inner.innerHTML = rawHtml;

      // Add syntax highlighting inside Shadow DOM
      if (window.hljs) {
        inner.querySelectorAll('pre code').forEach((block) => {
          window.hljs.highlightElement(block);
          addCodeBlockCopy(block);
        });
      }

      // Add copy response action row
      const actionsRow = document.createElement('div');
      actionsRow.className = 'msg-actions';

      const copyResBtn = document.createElement('button');
      copyResBtn.className = 'msg-action-btn';
      copyResBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Copy Response</span>
      `;
      copyResBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(content);
        copyResBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => { copyResBtn.querySelector('span').textContent = 'Copy Response'; }, 2000);
      });

      actionsRow.appendChild(copyResBtn);
      inner.appendChild(actionsRow);
    }

    bubble.appendChild(inner);
    chatBody.appendChild(bubble);
    scrollToBottom();
  }

  function addCodeBlockCopy(codeBlock) {
    const pre = codeBlock.parentNode;
    if (!pre || pre.querySelector('.code-copy-btn')) return;

    pre.style.position = 'relative';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.title = 'Copy code';

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(codeBlock.innerText);
      copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => {
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      }, 2000);
    });

    pre.appendChild(copyBtn);
  }

  function appendTypingIndicator() {
    const container = document.createElement('div');
    container.className = 'typing-indicator';
    container.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    chatBody.appendChild(container);
    scrollToBottom();
    return container;
  }

  function scrollToBottom() {
    chatBody.scrollTo({
      top: chatBody.scrollHeight,
      behavior: 'smooth'
    });
  }

  function formatBasicMarkdown(str) {
    if (!str) return '';
    let html = String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function showMissingApiKeyWarning() {
    // Clear chat list
    chatBody.innerHTML = '';
    
    const warning = document.createElement('div');
    warning.className = 'warning-card';
    warning.innerHTML = `
      <div class="warning-text">⚠️ No Gemini API key configured. Please configure it on the Zeno settings dashboard.</div>
      <button class="panel-btn primary" id="open-settings-btn">Open Settings</button>
    `;
    
    chatBody.appendChild(warning);
    
    shadow.getElementById('open-settings-btn').addEventListener('click', () => {
      window.open('http://localhost:5000/', '_blank');
    });
  }
})();
