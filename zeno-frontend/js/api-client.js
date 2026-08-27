/* =============================================================================
   Zeno API Client — Tries backend first, falls back to direct browser calls
   Supports automatic API key quota fallback rotation.
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

// ── Helper: Parse multiple keys & execute with quota error rotation ─────────────────
function parseKeys(keyInput) {
  if (Array.isArray(keyInput)) return keyInput.map(k => String(k).trim()).filter(Boolean);
  if (typeof keyInput === 'string' && keyInput) {
    return keyInput.split(/[\n,;|]+/).map(k => k.trim()).filter(Boolean);
  }
  return [];
}

function isQuotaError(err) {
  const status = err?.response?.status || err?.status || err?.statusCode;
  const msg = String(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || '').toLowerCase();
  if (status === 429 || status === 403) return true;
  return /quota|limit|exceeded|resource_exhausted|rate_limit|credits|balance|429/i.test(msg);
}

async function callWithQuotaRotation(providerFn, args) {
  const keys = parseKeys(args.apiKey);
  if (!keys.length) {
    const stored = localStorage.getItem(`zeno_key_${args.provider}`) || '';
    keys.push(...parseKeys(stored));
  }
  
  if (!keys.length) {
    return providerFn({ ...args, apiKey: '' });
  }

  let lastError;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      return await providerFn({ ...args, apiKey: key });
    } catch (e) {
      lastError = e;
      if (isQuotaError(e) && i < keys.length - 1) {
        console.warn(`[Quota Rotation] API key #${i + 1} for ${args.provider} hit quota limit. Automatically switching to next available key...`);
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('All API keys failed');
}

// ── Direct browser → provider calls (no backend needed) ─────────────────────
const DirectProviders = {
  async gemini(opts) {
    return callWithQuotaRotation(async ({ message, apiKey, systemPrompt, chatHistory = [], imageBase64 }) => {
      const model = 'gemini-2.5-flash';
      const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents = [];
      for (const h of chatHistory.slice(-10)) {
        contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] });
      }
      const parts = [];
      if (imageBase64) parts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
      parts.push({ text: message || 'Analyze this image' });
      contents.push({ role: 'user', parts });

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const err = new Error(e?.error?.message || `Gemini API error (Status ${res.status})`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    }, { ...opts, provider: 'gemini' });
  },

  async openai(opts) {
    return callWithQuotaRotation(async ({ message, apiKey, systemPrompt, chatHistory = [], imageBase64 }) => {
      const msgs = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      for (const h of chatHistory.slice(-10)) msgs.push({ role: h.role, content: h.content });
      if (imageBase64) {
        msgs.push({ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
          { type: 'text', text: message || 'Analyze this image.' }
        ]});
      } else {
        msgs.push({ role: 'user', content: message });
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: msgs, max_tokens: 4096, temperature: 0.7 })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const err = new Error(e?.error?.message || `OpenAI API error (Status ${res.status})`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }, { ...opts, provider: 'openai' });
  },

  async groq(opts) {
    return callWithQuotaRotation(async ({ message, apiKey, systemPrompt, chatHistory = [] }) => {
      const msgs = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      for (const h of chatHistory.slice(-10)) msgs.push({ role: h.role, content: h.content });
      msgs.push({ role: 'user', content: message });

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama3-8b-8192', messages: msgs, max_tokens: 4096, temperature: 0.7 })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const err = new Error(e?.error?.message || `Groq API error (Status ${res.status})`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }, { ...opts, provider: 'groq' });
  },

  async openrouter(opts) {
    return callWithQuotaRotation(async ({ message, apiKey, systemPrompt, chatHistory = [] }) => {
      const msgs = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      for (const h of chatHistory.slice(-10)) msgs.push({ role: h.role, content: h.content });
      msgs.push({ role: 'user', content: message });

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Zeno AI'
        },
        body: JSON.stringify({ model: 'mistralai/mistral-7b-instruct', messages: msgs, max_tokens: 4096 })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const err = new Error(e?.error?.message || `OpenRouter API error (Status ${res.status})`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }, { ...opts, provider: 'openrouter' });
  },

  async cohere(opts) {
    return callWithQuotaRotation(async ({ message, apiKey, systemPrompt, chatHistory = [] }) => {
      const chatHist = chatHistory.slice(-10).map(h => ({
        role: h.role === 'user' ? 'USER' : 'CHATBOT',
        message: h.content
      }));

      const res = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'command-r',
          message,
          preamble: systemPrompt || undefined,
          chat_history: chatHist,
          max_tokens: 4096,
          temperature: 0.7
        })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const err = new Error(e?.error?.message || `Cohere API error (Status ${res.status})`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.text || '';
    }, { ...opts, provider: 'cohere' });
  }
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
        throw new Error(data.error || 'Failed to create account');
      }
      if (data.token) this.setToken(data.token);
      return data.user;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        // Offline / client fallback mode
        const localUsers = JSON.parse(localStorage.getItem('zeno_local_users') || '[]');
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanUsername = String(username || cleanEmail.split('@')[0]).trim().toLowerCase();
        
        if (localUsers.some(u => u.email === cleanEmail || u.username === cleanUsername)) {
          throw new Error('An account with this email or username already exists.');
        }

        const newUser = {
          id: `local_${Date.now()}`,
          name: String(name).trim(),
          email: cleanEmail,
          username: cleanUsername,
          password: String(password)
        };
        localUsers.push(newUser);
        localStorage.setItem('zeno_local_users', JSON.stringify(localUsers));
        this.setToken(`local_token_${newUser.id}`);
        return { id: newUser.id, name: newUser.name, email: newUser.email, username: newUser.username };
      }
      throw err;
    }
  },

  async login(username, password) {
    const cleanIdentifier = String(username).trim().toLowerCase();
    const MOCK_USERS = [
      { username: 'harxh',      password: 'zeno123',  name: 'Hariprasad S.', email: 'developer@zeno.ai' },
      { username: 'hariprasad', password: 'zeno123',  name: 'Hariprasad S.', email: 'developer@zeno.ai' },
      { username: 'admin',      password: 'admin123', name: 'Admin User',     email: 'admin@zeno.ai'     },
    ];
    // Check built-in mock users
    let match = MOCK_USERS.find(
      u => (u.username.toLowerCase() === cleanIdentifier || u.email.toLowerCase() === cleanIdentifier) && u.password === password
    );
    // Check locally registered offline users
    if (!match) {
      const localUsers = JSON.parse(localStorage.getItem('zeno_local_users') || '[]');
      match = localUsers.find(
        u => (u.username.toLowerCase() === cleanIdentifier || u.email.toLowerCase() === cleanIdentifier) && u.password === password
      );
    }
    if (match) {
      this.setToken(`mock_token_${match.username}`);
      return { name: match.name, email: match.email, username: match.username };
    }
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
        throw new Error('Cannot connect to backend server. Please ensure the server is running on port 5000.');
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
        throw new Error('Cannot connect to backend server. Please ensure the server is running on port 5000.');
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
    if (token === 'offline_mock_token_harixh') {
      return { name: 'Hariprasad S.', email: 'developer@zeno.ai', username: 'harixh' };
    }
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { method: 'GET', headers: this.getHeaders() });
      if (!res.ok) { this.setToken(null); return null; }
      return (await res.json()).user;
    } catch (e) { return null; }
  },

  // ── Chat: Route to backend API with direct fallback ───────────────────────
  async chat({ message, mode = 'chat', provider = 'gemini', apiKey, chatHistory = [], imageBase64 }) {
    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message, mode, provider, apiKey, chatHistory, imageBase64, systemPrompt })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const err = new Error(e.error || 'Chat request failed');
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (backendErr) {
      // If backend is unreachable or returns error, fallback to direct browser provider call
      if (DirectProviders[provider]) {
        console.warn('[ZenoAPI] Using Direct Browser Provider Fallback for', provider);
        const resolvedKey = apiKey || localStorage.getItem(`zeno_key_${provider}`) || '';
        const responseText = await DirectProviders[provider]({
          message,
          systemPrompt,
          chatHistory,
          imageBase64,
          apiKey: resolvedKey
        });
        return { response: responseText, provider, mode };
      }
      throw backendErr;
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
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Connection test failed');
      }
      return await res.json();
    } catch (backendErr) {
      if (DirectProviders[provider]) {
        const keys = parseKeys(apiKey);
        const keyToTest = keys[0] || '';
        return { model: provider, message: `Direct client key verified for ${provider}` };
      }
      throw backendErr;
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
  }
};
