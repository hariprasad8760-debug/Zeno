/* =============================================================================
   Zeno Quick Action Panels Controller (Explain, Optimize, Debug)
   ============================================================================= */

window.ZenoModes = {
  currentMode: null,
  uploadedImageBase64: null,

  init(cards, panel, panelTitle, panelName, panelIcon, panelBody) {
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.action;
        this.openModePanel(mode, panel, panelTitle, panelName, panelIcon, panelBody);
        // Show mode banner at the top
        const banner = document.getElementById('mode-banner');
        const bannerText = document.getElementById('mode-banner-text');
        const meta = { explain: { icon: '🔍', label: 'Explain Error Mode' }, optimize: { icon: '⚡', label: 'Optimize Code Mode' }, debug: { icon: '🐛', label: 'Debug Mode' } };
        if (banner && meta[mode]) {
          if (bannerText) {
            bannerText.textContent = meta[mode].label + ' · ON';
          }
          banner.classList.add('show');
        }
      });
    });
  },

  openModePanel(mode, panel, panelTitle, panelName, panelIcon, panelBody) {
    this.currentMode = mode;
    this.uploadedImageBase64 = null;
    panel.classList.add('enabled');

    let titleText = 'Explain Error Mode';
    let iconText = '⚠️';
    let bodyHtml = '';

    if (mode === 'explain') {
      titleText = 'Explain Error Mode';
      iconText = '⚠️';
      bodyHtml = `
        <div class="mode-panel-inputs">
          <p class="mode-panel-instruction">Paste your source code together with compiler errors, exceptions, or stack traces below:</p>
          <textarea class="mode-input-textarea" id="mode-explain-input" placeholder="Paste code & error message here..."></textarea>
          <button class="mode-submit-btn" id="mode-explain-submit">Analyze & Explain Error</button>
        </div>
      `;
    } else if (mode === 'optimize') {
      titleText = 'Optimize Code Mode';
      iconText = '⚡';
      bodyHtml = `
        <div class="mode-panel-inputs">
          <p class="mode-panel-instruction">Paste the code you want Zeno to simplify, clean, and make faster:</p>
          <textarea class="mode-input-textarea" id="mode-optimize-input" placeholder="Paste your code here..."></textarea>
          <button class="mode-submit-btn" id="mode-optimize-submit">Optimize Code</button>
        </div>
      `;
    } else if (mode === 'debug') {
      titleText = 'Debug Mode';
      iconText = '🪲';
      bodyHtml = `
        <div class="mode-panel-inputs">
          <p class="mode-panel-instruction">Paste code, error messages, or upload a screenshot of your code/issue:</p>
          <textarea class="mode-input-textarea" id="mode-debug-input" placeholder="Paste code or issue description here..."></textarea>
          
          <div class="mode-debug-upload-row">
            <label class="mode-upload-label" for="mode-debug-file-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Upload Screenshot
            </label>
            <input type="file" id="mode-debug-file-input" accept="image/*" style="display:none;">
            <span class="mode-ocr-status" id="mode-ocr-status"></span>
          </div>

          <div class="mode-image-preview-container" id="mode-image-preview-container" style="display:none;">
            <img class="mode-image-preview" id="mode-image-preview-img">
            <button class="mode-image-preview-remove" id="mode-image-preview-remove">×</button>
          </div>

          <button class="mode-submit-btn" id="mode-debug-submit">Find & Fix Bugs</button>
        </div>
      `;
    }

    if (panelName) panelName.textContent = titleText;
    if (panelIcon) panelIcon.textContent = iconText;
    if (panelBody) {
      panelBody.innerHTML = bodyHtml;
      this.attachPanelListeners(mode);
    }
  },

  closeModePanel(panel) {
    this.currentMode = null;
    this.uploadedImageBase64 = null;
    if (panel) panel.classList.remove('enabled');
  },

  attachPanelListeners(mode) {
    if (mode === 'explain') {
      const btn = document.getElementById('mode-explain-submit');
      const input = document.getElementById('mode-explain-input');
      btn.addEventListener('click', () => {
        if (!input.value.trim()) return;
        this.submitModeRequest(mode, input.value);
      });
    } else if (mode === 'optimize') {
      const btn = document.getElementById('mode-optimize-submit');
      const input = document.getElementById('mode-optimize-input');
      btn.addEventListener('click', () => {
        if (!input.value.trim()) return;
        this.submitModeRequest(mode, input.value);
      });
    } else if (mode === 'debug') {
      const btn = document.getElementById('mode-debug-submit');
      const input = document.getElementById('mode-debug-input');
      const fileIn = document.getElementById('mode-debug-file-input');
      const previewContainer = document.getElementById('mode-image-preview-container');
      const previewImg = document.getElementById('mode-image-preview-img');
      const removeBtn = document.getElementById('mode-image-preview-remove');
      const ocrStatus = document.getElementById('mode-ocr-status');

      fileIn.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          this.uploadedImageBase64 = event.target.result.split(',')[1];
          previewImg.src = event.target.result;
          previewContainer.style.display = 'block';

          // Call backend OCR for preview/text extraction status
          ocrStatus.textContent = 'Extracting text...';
          try {
            const extractedText = await window.ZenoAPI.runOCR(this.uploadedImageBase64);
            ocrStatus.textContent = `OCR complete: ${extractedText.length} chars found`;
            // Append OCR text to input textarea for user visibility/editing
            if (extractedText) {
              input.value += `\n\n[Extracted from image]:\n${extractedText}`;
            }
          } catch (err) {
            ocrStatus.textContent = 'OCR failed, using image only';
            console.error('OCR Error:', err);
          }
        };
        reader.readAsDataURL(file);
      });

      removeBtn.addEventListener('click', () => {
        this.uploadedImageBase64 = null;
        fileIn.value = '';
        previewContainer.style.display = 'none';
        previewImg.src = '';
        ocrStatus.textContent = '';
      });

      btn.addEventListener('click', () => {
        const textVal = input.value.trim();
        if (!textVal && !this.uploadedImageBase64) return;
        this.submitModeRequest(mode, textVal, this.uploadedImageBase64);
      });
    }
  },

  async submitModeRequest(mode, text, imageBase64 = null) {
    if (window.ZenoApp && typeof window.ZenoApp.triggerCustomModeSubmit === 'function') {
      window.ZenoApp.triggerCustomModeSubmit(mode, text, imageBase64);
    }
  }
};
