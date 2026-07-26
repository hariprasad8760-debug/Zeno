/* =============================================================================
   Zeno AI Agent Mode Controller
   ============================================================================ */

window.ZenoAgentMode = {
  isEnabled: false,

  init(toggleEl, descEl, floatBtnContainer, floatBtn, popupEl) {
    this.isEnabled = localStorage.getItem('zeno_agent_mode') === 'true';
    this.updateUI(toggleEl, descEl, floatBtnContainer);

    // Sidebar Agent Toggle Listener
    if (toggleEl) {
      // Clean clone to avoid duplicate listeners if initialized multiple times
      const newToggle = toggleEl.cloneNode(true);
      toggleEl.parentNode.replaceChild(newToggle, toggleEl);
      
      newToggle.addEventListener('change', (e) => {
        this.isEnabled = e.target.checked;
        localStorage.setItem('zeno_agent_mode', this.isEnabled);
        this.updateUI(newToggle, descEl, floatBtnContainer);
      });
    }

    // Floating button position is handled by CSS (bottom-right)
  },

  updateUI(toggleEl, descEl, floatBtnContainer) {
    if (toggleEl) {
      toggleEl.checked = this.isEnabled;
      const sidebarRow = toggleEl.closest('.sidebar-setting-row');
      if (sidebarRow) {
        if (this.isEnabled) {
          sidebarRow.classList.add('agent-mode-on');
        } else {
          sidebarRow.classList.remove('agent-mode-on');
        }
      }
      // Toggle glow class on the agent-mode-panel container
      const agentPanel = document.querySelector('.agent-mode-panel');
      if (agentPanel) {
        if (this.isEnabled) {
          agentPanel.classList.add('enabled');
        } else {
          agentPanel.classList.remove('enabled');
        }
      }
    }

    if (descEl) {
      descEl.textContent = this.isEnabled 
        ? 'Deep analysis & background system operations ACTIVE.'
        : 'Deep AI reasoning and continuous operations.';
    }

    // Clean up any lingering animations/notifs
    const existingOverlay = document.querySelector('.agent-radar-overlay');
    if (existingOverlay) existingOverlay.remove();
    const existingNotif = document.querySelector('.agent-notif-banner');
    if (existingNotif) existingNotif.remove();
    const existingBWNotif = document.querySelector('.agent-notif-banner-bw');
    if (existingBWNotif) existingBWNotif.remove();

    if (this._searchTimeout) clearTimeout(this._searchTimeout);

    // Build simple black-and-white top notification banner
    const notif = document.createElement('div');
    notif.className = 'agent-notif-banner-bw';
    notif.innerHTML = `
      <span class="agent-notif-bw-text">● Agent Mode ${this.isEnabled ? 'ON' : 'OFF'}</span>
    `;
    document.body.appendChild(notif);

    // Remove notification after 2 seconds
    this._searchTimeout = setTimeout(() => {
      notif.classList.add('hide');
      setTimeout(() => notif.remove(), 300);
    }, 2000);

    if (floatBtnContainer) {
      if (this.isEnabled) {
        floatBtnContainer.classList.add('visible');
      } else {
        floatBtnContainer.classList.remove('visible');
      }
    }
  },

  // Redirection handler for Flutter desktop integration hook
  handleResponse(responseContent, messageListElement, chatHistoryArray) {
    // If running in Flutter context (target desktop popup)
    if (window.zenoAgentTarget === 'desktop-popup') {
      console.log('[Flutter Hook] Forwarding response to desktop agent popup');
      if (window.flutter_inappwebview) {
        window.flutter_inappwebview.callHandler('onAgentResponse', responseContent);
      }
      // Prepare web structure fallback popup alert
      this.showWebFallbackPopup(responseContent);
    } else {
      // Normal flow inside website: add to conversation
      if (window.ZenoApp && typeof window.ZenoApp.addMessageToFeed === 'function') {
        window.ZenoApp.addMessageToFeed({
          role: 'assistant',
          content: responseContent
        });
      }
    }
  },

  showWebFallbackPopup(content) {
    const fallback = document.createElement('div');
    fallback.className = 'agent-desktop-fallback-popup';
    fallback.innerHTML = `
      <div class="fallback-popup-header">
        <span>Desktop Agent Event</span>
        <button class="fallback-popup-close">×</button>
      </div>
      <div class="fallback-popup-body">${content}</div>
    `;
    document.body.appendChild(fallback);
    fallback.querySelector('.fallback-popup-close').addEventListener('click', () => fallback.remove());
  }
};
