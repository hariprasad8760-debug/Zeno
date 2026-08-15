/* =============================================================================
   Zeno Voice Engine — Reliable STT using MediaRecorder + Web Speech API
   ============================================================================= */

window.ZenoVoice = {
  recognition: null,
  isListening: false,
  activeSpeakerBtn: null,
  silenceTimer: null,
  onResultCallback: null,
  onErrorCallback: null,
  onEndCallback: null,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not supported in this browser.");
      return;
    }

    this._createRecognition(SpeechRecognition);
  },

  _createRecognition(SpeechRecognition) {
    const SR = SpeechRecognition || window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = false;     // short utterance mode — most reliable
    this.recognition.interimResults = false; // only return final confirmed text
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log("[ZenoVoice] Listening started.");
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript && this.onResultCallback) {
        this.onResultCallback(transcript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error("[ZenoVoice] Error:", event.error);

      // 'no-speech' is not a fatal error — just restart quietly
      if (event.error === 'no-speech') {
        console.log("[ZenoVoice] No speech yet, restarting...");
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch(e) { /* already started */ }
        }
        return;
      }

      // 'aborted' happens when we call .stop() ourselves — not an error
      if (event.error === 'aborted') {
        return;
      }

      let errorMsg = `Voice error: ${event.error}`;
      if (event.error === 'not-allowed') {
        errorMsg = "Microphone access denied. Please click the mic icon in the address bar and allow access.";
      } else if (event.error === 'network') {
        errorMsg = "Network error with speech recognition. Please check your internet connection.";
      } else if (event.error === 'audio-capture') {
        errorMsg = "No microphone found. Please check your audio input device.";
      }

      if (this.onErrorCallback) this.onErrorCallback(errorMsg);
      this._doStop();
    };

    this.recognition.onend = () => {
      console.log("[ZenoVoice] Recognition ended. isListening:", this.isListening);

      // If we're still supposed to be listening (user hasn't clicked stop)
      // restart automatically to keep the mic open continuously
      if (this.isListening) {
        try {
          this.recognition.start();
          console.log("[ZenoVoice] Auto-restarted recognition.");
        } catch(e) {
          console.warn("[ZenoVoice] Could not restart:", e.message);
          this._doStop();
        }
      } else {
        if (this.onEndCallback) this.onEndCallback();
      }
    };
  },

  startListening(onResult, onError, onEnd) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    if (!this.recognition) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        if (onError) onError("Your browser does not support voice input. Please use Chrome or Edge.");
        return;
      }
      this._createRecognition(SR);
    }

    this.isListening = true;
    try {
      this.recognition.start();
    } catch(err) {
      console.error("[ZenoVoice] Start error:", err);
      if (onError) onError("Could not start microphone. Please refresh and try again.");
      this.isListening = false;
    }
  },

  stopListening() {
    this._doStop();
  },

  _doStop() {
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    try {
      if (this.recognition) this.recognition.stop();
    } catch(e) { /* ignore */ }
  },

  // =========================================================================
  //  TEXT-TO-SPEECH
  // =========================================================================

  speak(text, btnElement, onEndCallback) {
    if (!window.speechSynthesis) {
      console.warn("SpeechSynthesis API not supported.");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (this.activeSpeakerBtn) {
        this.resetSpeakerBtn(this.activeSpeakerBtn);
      }
      if (this.activeSpeakerBtn === btnElement) {
        this.activeSpeakerBtn = null;
        return;
      }
    }

    if (!text) return;

    this.activeSpeakerBtn = btnElement;
    this.setSpeakerBtnPlaying(btnElement);

    // Strip markdown before reading aloud
    let cleanText = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`[^`]*`/g, '')
      .replace(/[*_~#>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Natural') || v.lang === 'en-US'
    ) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (this.activeSpeakerBtn === btnElement) {
        this.resetSpeakerBtn(btnElement);
        this.activeSpeakerBtn = null;
      }
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (e) => {
      console.error("TTS error", e);
      if (this.activeSpeakerBtn === btnElement) {
        this.resetSpeakerBtn(btnElement);
        this.activeSpeakerBtn = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  },

  stopSpeaking() {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (this.activeSpeakerBtn) {
        this.resetSpeakerBtn(this.activeSpeakerBtn);
        this.activeSpeakerBtn = null;
      }
    }
  },

  setSpeakerBtnPlaying(btn) {
    if (!btn) return;
    btn.classList.add('playing');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"></rect></svg> <span>Stop</span>`;
  },

  resetSpeakerBtn(btn) {
    if (!btn) return;
    btn.classList.remove('playing');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg> <span>Speak</span>`;
  }
};

// Pre-load voices
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

window.ZenoVoice.init();
