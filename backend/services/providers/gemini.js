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
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build contents array
  const contents = [];

  // Add chat history
  for (const msg of chatHistory.slice(-10)) { // last 10 messages for context
    contents.push({
      role:  msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  // Build current user message parts
  const parts = [];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
  }
  parts.push({ text: message || 'Analyze this image. Specifically read, transcribe, and analyze any text, code, logs, or error messages visible in the screenshot.' });
  contents.push({ role: 'user', parts });

  const body = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      temperature:     0.7,
      maxOutputTokens: 4096,
    }
  };

  const { data } = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  });

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

async function testConnection(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  const model = data?.models?.[0]?.name?.split('/').pop() || 'gemini';
  return { model, message: 'Connected to Gemini API' };
}

module.exports = { id, name, envKeyName, models, getEnvKey, chat, testConnection };
