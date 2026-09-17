/* =============================================================================
   Zeno API Client — Connects strictly to Render Backend (or local backend)
   No client-side direct provider calls; all requests route through /api
   ============================================================================= */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://zeno-z94s.onrender.com/api';

const BASE_PROMPT = `You are Zeno, an expert AI coding assistant. You are precise, helpful, and concise.
Format your responses using clean markdown. Use code blocks with language identifiers for all code snippets.
When providing step-by-step explanations, format each step clearly (e.g. Step 1: ..., Step 2: ...) with normal plain text and code blocks.
Do NOT use LaTeX math symbols, encrypted characters, or raw codes like $4/ for simple steps. Always output clean, normal text.`;

const SYSTEM_PROMPTS = {
  chat:          BASE_PROMPT,
  explain_error: BASE_PROMPT + `\n\nYou are in EXPLAIN ERROR mode.\nWhen given code and/or error messages, explain the errors line by line in clear steps followed by the solution.`,
  optimize:      BASE_PROMPT + `\n\nYou are in OPTIMIZE CODE mode.\nWhen given code, simplify it in clear steps and provide the clean, optimized code.`,
  debug:         BASE_PROMPT + `\n\nYou are in DEBUG MODE.\nWhen given source code and/or error messages, identify the bugs step by step and return the correct fixed code.`,
};

// ── Main API Client ──────────────────────────────────────────────────────────
window.ZenoAPI = {
  getToken() { return localStorage.getItem('zeno_auth_token'); },

  setToken(token) {
    if (token) localStorage.setItem('zeno_auth_token', token);
    else localStorage.removeItem('zeno_auth_token');
  },

  getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  async register({ name, email, username, password, confirmPassword }) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password, confirmPassword })
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('Invalid server response.'); }
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to create account');
      }
      if (data.token) this.setToken(data.token);
      return data.user;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Cannot connect to backend server. Please ensure the server is running.');
      }
      throw err;
    }
  },

  async login(username, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Invalid credentials'); }
      const data = await res.json();
      this.setToken(data.token);
      return data.user;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') throw new Error('Invalid username or password');
      throw err;
    }
  },

  async sendOTP(email) {
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(email).trim() })
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('Server returned an empty or invalid response.'); }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP verification code');
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Cannot connect to backend server. Please ensure the server is running.');
      }
      throw err;
    }
  },

  async verifyOTP(email, otp) {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(email).trim(), otp: String(otp).trim() })
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('Server returned an empty or invalid response.'); }
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      this.setToken(data.token);
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Cannot connect to backend server. Please ensure the server is running.');
      }
      throw err;
    }
  },

  async logout() {
    const headers = this.getHeaders();
    this.setToken(null);
    try { await fetch(`${API_BASE}/auth/logout`, { method: 'DELETE', headers }); }
    catch (e) { /* backend offline — ignore */ }
  },

  async checkAuth() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { method: 'GET', headers: this.getHeaders() });
      if (!res.ok) { this.setToken(null); return null; }
      return (await res.json()).user;
    } catch (e) { return null; }
  },

  // ── Chat: Route strictly to backend API ────────────────────────────────────
  async chat({ message, mode = 'chat', provider = 'gemini', apiKey, chatHistory = [], imageBase64 }) {
    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message, mode, provider, apiKey, chatHistory, imageBase64, systemPrompt })
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Server returned invalid response (Status ${res.status})`);
      }
      if (!res.ok) {
        throw new Error(data.error || data.message || `Chat request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Cannot connect to Zeno backend server. Please ensure the server is reachable.');
      }
      throw err;
    }
  },

  // ── Test connection ────────────────────────────────────────────────────────
  async testProviderConnection(provider, apiKey) {
    try {
      const res = await fetch(`${API_BASE}/providers/test`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ provider, apiKey })
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) {}
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Connection test failed');
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Cannot connect to Zeno backend server.');
      }
      throw err;
    }
  },

  async runOCR(imageBase64) {
    try {
      const res = await fetch(`${API_BASE}/ocr/base64`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ imageBase64 })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'OCR failed'); }
      return (await res.json()).text;
    } catch (e) {
      if (e.message === 'Failed to fetch' || e.name === 'TypeError') throw new Error('OCR requires backend server to be running.');
      throw e;
    }
  },

  // ── Image Generation ────────────────────────────────────────────────────────
  async generateImage({ prompt, width = 1024, height = 1024, style = '' }) {
    try {
      const res = await fetch(`${API_BASE}/image/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ prompt, width, height, style })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        // Direct browser fallback if backend is asleep or unreachable
        const cleanPrompt = encodeURIComponent(prompt.trim());
        const seed = Math.floor(Math.random() * 10000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
        return {
          success: true,
          imageUrl,
          prompt: prompt.trim(),
          response: `Here is your generated image:\n\n![${prompt.trim()}](${imageUrl})\n\n**Prompt:** *${prompt.trim()}*\n\n[⬇️ Click here to open / download full resolution image](${imageUrl})`,
          mode: 'image_generate'
        };
      }
      throw err;
    }
  }
};
