/* =============================================================================
   Gemini Provider — Google Gemini API
   ============================================================================= */

const axios = require('axios');

const id         = 'gemini';
const name       = 'Gemini API';
const envKeyName = 'GEMINI_API_KEY';
const models     = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'];

function getEnvKey() { return process.env.GEMINI_API_KEY || ''; }

async function chat({ message, systemPrompt, chatHistory = [], imageBase64, apiKey }) {
  if (apiKey && String(apiKey).startsWith('AQ.')) {
    const err = new Error("Invalid Gemini API key format. Gemini API keys from Google AI Studio begin with 'AIzaSy'.");
    err.status = 401;
    throw err;
  }
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const modelsToTry = [preferredModel, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);

  // Build current user message parts
  const parts = [];
  if (imageBase64) {
    let cleanBase64 = String(imageBase64).trim();
    let mimeType = 'image/png';
    const match = cleanBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/s);
    if (match) {
      mimeType = match[1];
      cleanBase64 = match[2];
    }
    // Remove any newlines or whitespace in base64 string
    cleanBase64 = cleanBase64.replace(/\s+/g, '');
    parts.push({ inlineData: { mimeType, data: cleanBase64 } });
  }
  const promptText = message || 'Analyze this image in detail. Read, transcribe, and analyze any code, text, diagrams, UI elements, or error messages visible.';
  parts.push({ text: promptText });

  // Filter history to strictly alternate and avoid duplicating the current user message
  const rawHistory = Array.isArray(chatHistory) ? chatHistory.slice(-10) : [];
  // If the last message in history is the user's current message, omit it from prior history
  const historyToUse = (rawHistory.length > 0 && rawHistory[rawHistory.length - 1].role === 'user')
    ? rawHistory.slice(0, -1)
    : rawHistory;

  const contents = [];
  let expectedRole = 'user';

  for (const msg of historyToUse) {
    const role = msg.role === 'user' ? 'user' : 'model';
    if (!msg.content || typeof msg.content !== 'string' || !msg.content.trim()) continue;

    // Gemini requires strict alternating user/model
    if (role === expectedRole) {
      contents.push({
        role,
        parts: [{ text: msg.content.trim() }]
      });
      expectedRole = role === 'user' ? 'model' : 'user';
    }
  }

  // Ensure last message before current one is 'model', or contents is empty
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }

  // Finally append the current user message
  contents.push({ role: 'user', parts });

  const body = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      temperature:     0.7,
      maxOutputTokens: 4096,
    }
  };

  let lastError = null;
  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const { data } = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      // If 404 (model not found), try next model in list
      if (status === 404 && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
        console.warn(`[Gemini Provider] Model ${model} returned 404. Falling back to next model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Gemini API call failed');
}

async function testConnection(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  const model = data?.models?.[0]?.name?.split('/').pop() || 'gemini';
  return { model, message: 'Connected to Gemini API' };
}

module.exports = { id, name, envKeyName, models, getEnvKey, chat, testConnection };
