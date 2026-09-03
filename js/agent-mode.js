/* =============================================================================
   Zeno AI Agent Mode & Browser Extension Manager
   Handles extension detection, installation flow, glowing pulse states,
   and Agent Mode activation handshake.
   ============================================================================= */

// Direct Package Download URL
window.EXTENSION_DOWNLOAD_URL = "zeno-extension.zip";

window.ZenoExtension = {
  isInstalled: false,
  hasOpenedStore: false,
  _listenersAttached: false,

  init() {
    this.bindEvents();
    this.check();
    this.updateUI();

    // Re-check when user switches back to the Zeno tab after installing
    window.addEventListener('focus', () => this.check());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.check();
      }
    });

    // Listen for extension postMessage handshake
    window.addEventListener('message', (event) => {
      if (
        event.data &&
        (event.data.type === 'ZENO_EXTENSION_PONG' ||
         event.data.type === 'ZENO_EXTENSION_READY' ||
         event.data.source === 'zeno-extension')
      ) {
        this.setInstalled(true);
      }
    });

    // Listen for custom event handshake from extension content scripts
    document.addEventListener('zeno:pong-extension', () => {
      this.setInstalled(true);
    });

    document.addEventListener('zeno-extension-ready', () => {
      this.setInstalled(true);
    });
  },

  /**
   * Check if Zeno browser extension is installed.
   * Supports window globals, data attributes, postMessage, CustomEvents, and localStorage override.
   */
  check(callback) {
    // 1. Direct DOM/window detection or stored download state
    const isDirectlyDetected = Boolean(
      window.__ZENO_EXTENSION_INSTALLED__ === true ||
      document.documentElement.dataset.zenoExtension === 'installed' ||
      localStorage.getItem('zeno_extension_installed') === 'true' ||
      localStorage.getItem('zeno_extension_downloaded') === 'true'
    );

    if (isDirectlyDetected) {
      this.setInstalled(true);
      if (callback) callback(true);
      return;
    }

    // 2. Dispatch lightweight handshake ping
    try {
      window.postMessage({ source: 'zeno-web', type: 'ZENO_EXTENSION_PING' }, '*');
      document.dispatchEvent(new CustomEvent('zeno:ping-extension'));
    } catch (e) {}

    // Async callback response
    if (callback) {
      setTimeout(() => {
        callback(this.isInstalled);
      }, 150);
    }
  },

  /**
   * Set installed status and update all related UI elements
   */
  setInstalled(installed) {
    const wasInstalled = this.isInstalled;
    this.isInstalled = Boolean(installed);
    if (installed) {
      localStorage.setItem('zeno_extension_installed', 'true');
      localStorage.setItem('zeno_extension_downloaded', 'true');
    }

    this.updateUI();

    // If user enabled agent mode previously, sync UI state now that extension is active
    if (installed && window.ZenoAgentMode && localStorage.getItem('zeno_agent_mode') === 'true') {
      window.ZenoAgentMode.isEnabled = true;
      window.ZenoAgentMode.updateUI(null, null, null, false);
    }

    // If modal is currently visible, update status badge and auto-enable
    const modal = document.getElementById('extension-modal');
    if (modal && modal.classList.contains('show') && this.isInstalled) {
      const statusDot = document.getElementById('detection-status-dot');
      const statusText = document.getElementById('detection-status-text');

      if (statusDot) {
        statusDot.className = 'detection-dot verified';
      }
      if (statusText) {
        statusText.textContent = 'Extension Active & Ready! ✅';
        statusText.style.color = '#10b981';
      }

      setTimeout(() => {
        this.hideInstallModal();
        if (window.ZenoAgentMode) {
          window.ZenoAgentMode.enable();
        }
      }, 800);
    }
  },

  /**
   * Update Extension Top-Bar Button glow and status dot
   */
  updateUI() {
    const extBtn = document.getElementById('header-extension-btn');
    const statusDot = document.getElementById('extension-status-dot');

    if (extBtn) {
      if (this.isInstalled) {
        extBtn.classList.remove('glow-pulse');
        extBtn.title = "Zeno Extension (Installed & Active)";
      } else if (!this.hasOpenedStore) {
        extBtn.classList.add('glow-pulse');
        extBtn.title = "Download & Install Zeno Extension";
      } else {
        // Stop glow after user clicks the extension button
        extBtn.classList.remove('glow-pulse');
        extBtn.title = "Zeno Extension (Installed)";
      }
    }

    if (statusDot) {
      if (this.isInstalled) {
        statusDot.className = 'extension-status-dot installed';
      } else {
        statusDot.className = 'extension-status-dot';
      }
    }
  },

  /**
   * Trigger direct download of zeno-extension.zip and mark extension as installed permanently
   */
  downloadExtension() {
    this.hasOpenedStore = true;
    localStorage.setItem('zeno_extension_installed', 'true');
    localStorage.setItem('zeno_extension_downloaded', 'true');
    this.setInstalled(true);

    // Trigger direct file download of zeno-extension.zip
    const downloadLink = document.createElement('a');
    downloadLink.href = window.EXTENSION_DOWNLOAD_URL || 'zeno-extension.zip';
    downloadLink.download = 'zeno-extension.zip';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    // Enable agent mode immediately
    if (window.ZenoAgentMode) {
      window.ZenoAgentMode.enable();
    }
  },

  openStore() {
    this.downloadExtension();
  },

  /**
   * Open the "Zeno Agent Mode Requires Extension" Modal
   */
  showInstallModal() {
    const modal = document.getElementById('extension-modal');
    if (modal) {
      modal.classList.add('show');
      const statusDot = document.getElementById('detection-status-dot');
      const statusText = document.getElementById('detection-status-text');

      if (statusDot) {
        statusDot.className = this.isInstalled ? 'detection-dot verified' : 'detection-dot unverified';
      }
      if (statusText) {
        statusText.textContent = this.isInstalled ? 'Extension Installed & Active! ✅' : 'Extension not detected';
        statusText.style.color = this.isInstalled ? '#10b981' : '';
      }
    }
  },

  /**
   * Close the Extension Modal
   */
  hideInstallModal() {
    const modal = document.getElementById('extension-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  },

  /**
   * Bind event listeners for extension button, modal buttons, and backdrop
   */
  bindEvents() {
    if (this._listenersAttached) return;
    this._listenersAttached = true;

    // Header Extension Button Click
    const extBtn = document.getElementById('header-extension-btn');
    if (extBtn) {
      extBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.isInstalled) {
          // If already installed, toggle Agent Mode directly or show notification
          if (window.ZenoAgentMode) {
            if (window.ZenoAgentMode.isEnabled) {
              window.ZenoAgentMode.disable();
            } else {
              window.ZenoAgentMode.enable();
            }
          }
        } else {
          // If not installed, show installation modal
          this.showInstallModal();
        }
      });
    }

    // Modal Close Button
    const closeBtn = document.getElementById('extension-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideInstallModal());
    }

    // Modal Cancel Button
    const cancelBtn = document.getElementById('extension-btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideInstallModal());
    }

    // Modal Install/Download Button
    const installBtn = document.getElementById('extension-btn-install');
    if (installBtn) {
      installBtn.addEventListener('click', () => {
        this.downloadExtension();
      });
    }

    // Modal Check Again Button
    const checkBtn = document.getElementById('extension-btn-check');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        checkBtn.disabled = true;
        const statusText = document.getElementById('detection-status-text');
        if (statusText) {
          statusText.textContent = 'Checking extension...';
          statusText.style.color = '';
        }

        this.check((installed) => {
          checkBtn.disabled = false;
          const statusDot = document.getElementById('detection-status-dot');
          const statusTextEl = document.getElementById('detection-status-text');

          if (installed) {
            if (statusDot) statusDot.className = 'detection-dot verified';
            if (statusTextEl) {
              statusTextEl.textContent = 'Extension Detected! ✅';
              statusTextEl.style.color = '#10b981';
            }
            setTimeout(() => {
              this.hideInstallModal();
              if (window.ZenoAgentMode) {
                window.ZenoAgentMode.enable();
              }
            }, 1000);
          } else {
            if (statusDot) statusDot.className = 'detection-dot unverified';
            if (statusTextEl) {
              statusTextEl.textContent = 'Extension not detected. Please install and try again.';
              statusTextEl.style.color = '#ef4444';
            }
          }
        });
      });
    }

    // Close on overlay backdrop click
    const modal = document.getElementById('extension-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideInstallModal();
        }
      });
    }
  }
};

/* =============================================================================
   Zeno AI Agent Mode Controller
   ============================================================================ */

window.ZenoAgentMode = {
  isEnabled: false,
  toggleEl: null,
  descEl: null,
  floatBtnContainer: null,

  init(toggleEl, descEl, floatBtnContainer, floatBtn, popupEl) {
    this.toggleEl = toggleEl;
    this.descEl = descEl;
    this.floatBtnContainer = floatBtnContainer;

    // Initialize extension manager
    if (window.ZenoExtension) {
      window.ZenoExtension.init();
    }

    // Only restore previous state if extension is currently installed
    const savedState = localStorage.getItem('zeno_agent_mode') === 'true';
    const hasExtension = window.ZenoExtension && window.ZenoExtension.isInstalled;
    this.isEnabled = savedState && hasExtension;

    this.updateUI(toggleEl, descEl, floatBtnContainer, false);

    // Sidebar Agent Toggle Listener
    if (toggleEl) {
      const newToggle = toggleEl.cloneNode(true);
      toggleEl.parentNode.replaceChild(newToggle, toggleEl);
      this.toggleEl = newToggle;
      
      newToggle.addEventListener('change', (e) => {
        if (newToggle.checked) {
          // Check if extension is installed before enabling
          if (!window.ZenoExtension || !window.ZenoExtension.isInstalled) {
            // Revert toggle state immediately
            newToggle.checked = false;
            this.isEnabled = false;
            localStorage.setItem('zeno_agent_mode', 'false');
            this.updateUI(newToggle, descEl, floatBtnContainer, false);

            // Trigger Extension Installation Modal
            if (window.ZenoExtension) {
              window.ZenoExtension.showInstallModal();
            }
            return;
          }
          this.isEnabled = true;
        } else {
          this.isEnabled = false;
        }

        localStorage.setItem('zeno_agent_mode', this.isEnabled);
        try {
          window.postMessage({ source: 'zeno-web', type: 'ZENO_SYNC_SETTINGS', agentMode: String(this.isEnabled) }, '*');
        } catch (err) {}
        this.updateUI(newToggle, descEl, floatBtnContainer);
      });
    }
  },

  enable() {
    this.isEnabled = true;
    localStorage.setItem('zeno_agent_mode', 'true');
    try {
      window.postMessage({ source: 'zeno-web', type: 'ZENO_SYNC_SETTINGS', agentMode: 'true' }, '*');
    } catch (err) {}
    this.updateUI(this.toggleEl, this.descEl, this.floatBtnContainer);
  },

  disable() {
    this.isEnabled = false;
    localStorage.setItem('zeno_agent_mode', 'false');
    try {
      window.postMessage({ source: 'zeno-web', type: 'ZENO_SYNC_SETTINGS', agentMode: 'false' }, '*');
    } catch (err) {}
    this.updateUI(this.toggleEl, this.descEl, this.floatBtnContainer);
  },

  updateUI(toggleEl, descEl, floatBtnContainer, showNotification = true) {
    const toggle = toggleEl || this.toggleEl;
    const desc = descEl || this.descEl;
    const floatContainer = floatBtnContainer || this.floatBtnContainer;

    if (toggle) {
      toggle.checked = this.isEnabled;
      const sidebarRow = toggle.closest('.sidebar-setting-row');
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

    if (desc) {
      desc.textContent = this.isEnabled 
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

    if (showNotification) {
      // Build top notification banner
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
    }

    if (floatContainer) {
      if (this.isEnabled) {
        floatContainer.classList.add('visible');
      } else {
        floatContainer.classList.remove('visible');
      }
    }
  },

  // Redirection handler for desktop integration hook
  handleResponse(responseContent, messageListElement, chatHistoryArray) {
    if (window.zenoAgentTarget === 'desktop-popup') {
      console.log('[Hook] Forwarding response to desktop agent popup');
      if (window.flutter_inappwebview) {
        window.flutter_inappwebview.callHandler('onAgentResponse', responseContent);
      }
      this.showWebFallbackPopup(responseContent);
    } else {
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

// Initialize extension detector on script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.ZenoExtension) window.ZenoExtension.init();
  });
} else {
  if (window.ZenoExtension) window.ZenoExtension.init();
}
