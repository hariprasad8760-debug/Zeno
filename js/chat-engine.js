/* =============================================================================
   Zeno Chat Engine — Markdown rendering, syntax highlighting, actions
   ============================================================================= */

window.ZenoChatEngine = {
  renderMessage(msg, onRegenerate) {
    const isUser = msg.role === 'user';
    const msgEl = document.createElement('div');
    msgEl.className = `message-bubble ${isUser ? 'user' : 'assistant'} slide-in`;
    msgEl.dataset.msgId = msg.id || Date.now();

    // Icon/Avatar wrapper
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    if (isUser) {
      avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    } else {
      avatar.innerHTML = `<img src="assets/brain_logo.png" class="zeno-logo-img" alt="Zeno" style="width:100%;height:100%;object-fit:cover;">`;
    }

    // Content container
    const content = document.createElement('div');
    content.className = 'message-content';

    if (isUser) {
      // User message is plain text / simple formatted
      const p = document.createElement('p');
      p.textContent = msg.content;
      content.appendChild(p);
      if (msg.image) {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'message-image-wrap';
        imgWrap.innerHTML = `<img src="${msg.image}" alt="Uploaded image" class="chat-uploaded-img">`;
        content.appendChild(imgWrap);
      }
    } else {
      // Assistant response is Markdown rendered
      let html = '';
      if (window.marked && window.DOMPurify) {
        const rawHtml = window.marked.parse(msg.content);
        html = window.DOMPurify.sanitize(rawHtml);
      } else {
        // Simple fallback if script tags failed to load
        html = msg.content.replace(/\n/g, '<br>');
      }
      content.innerHTML = html;

      // Highlight code blocks
      if (window.hljs) {
        content.querySelectorAll('pre code').forEach((block) => {
          window.hljs.highlightElement(block);
          this.addCodeBlockActions(block);
        });
      }

      // Add response action buttons (Copy, Regenerate)
      const actions = document.createElement('div');
      actions.className = 'message-actions';

      // Copy response button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'msg-action-btn';
      copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>Copy</span>`;
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(msg.content);
        copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => { copyBtn.querySelector('span').textContent = 'Copy'; }, 2000);
      });

      // Regenerate button
      if (onRegenerate) {
        const regenBtn = document.createElement('button');
        regenBtn.className = 'msg-action-btn';
        regenBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> <span>Regenerate</span>`;
        regenBtn.addEventListener('click', () => {
          onRegenerate(msg.id);
        });
        actions.appendChild(regenBtn);
      }

      // Speaker button
      const speakBtn = document.createElement('button');
      speakBtn.className = 'msg-action-btn speaker-btn';
      speakBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg> <span>Speak</span>`;
      speakBtn.addEventListener('click', () => {
        if (window.ZenoVoice) {
          window.ZenoVoice.speak(msg.content, speakBtn);
        }
      });
      actions.appendChild(speakBtn);

      actions.appendChild(copyBtn);
      content.appendChild(actions);
    }

    msgEl.appendChild(avatar);
    msgEl.appendChild(content);
    return msgEl;
  },

  addCodeBlockActions(codeBlock) {
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
  },

  scrollToBottom(container) {
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }
};

/* =============================================================================
   Zeno Light Travelling Shimmer Loader
   ============================================================================= */

window.ZenoPuzzleLoader = {
  textTimer: null,

  start(canvasEl, textDotsEl) {
    this.stop();
    if (textDotsEl) {
      let step = 0;
      const dotsArr = ['.', '..', '...', ''];
      textDotsEl.textContent = '...';
      this.textTimer = setInterval(() => {
        step = (step + 1) % dotsArr.length;
        textDotsEl.textContent = dotsArr[step];
      }, 350);
    }
  },

  stop() {
    if (this.textTimer) {
      clearInterval(this.textTimer);
      this.textTimer = null;
    }
  }
};
