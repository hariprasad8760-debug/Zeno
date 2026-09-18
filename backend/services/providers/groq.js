/* Groq Provider — OpenAI-compatible API */
const axios = require('axios');
const id = 'groq';
const name = 'Groq API';
const envKeyName = 'GROQ_API_KEY';
const models = ['qwen/qwen3.8-27b', 'groq/compound', 'groq/compound-mini', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function getEnvKey() {
  return process.env.GROQ_API_KEY || '';
}

async function chat({ message, systemPrompt, chatHistory = [], imageBase64, apiKey }) {
  const preferredModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
  const modelsToTry = [preferredModel, 'qwen/qwen3.8-27b', 'groq/compound', 'groq/compound-mini'].filter((v, i, a) => a.indexOf(v) === i);

  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });

  const rawHistory = Array.isArray(chatHistory) ? chatHistory.slice(-6) : [];
  const historyToUse = (rawHistory.length > 0 && rawHistory[rawHistory.length - 1].role === 'user')
    ? rawHistory.slice(0, -1)
    : rawHistory;

  for (const h of historyToUse) {
    if (h.content) msgs.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content });
  }

  let userText = message || 'Please analyze this in detail.';
  if (imageBase64) {
    userText = `[User attached an image for inspection]\n\n${userText}`;
  }
  msgs.push({ role: 'user', content: userText });

  let lastError = null;
  for (const model of modelsToTry) {
    try {
      const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions',
        { model, messages: msgs, max_tokens: 2048, temperature: 0.7 },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const errMsg = JSON.stringify(err.response?.data || '');
      const shouldFallback = status === 404 || status === 429 || /otpm|output tokens per minute|rate.limit|too large/i.test(errMsg);
      if (shouldFallback && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Groq request failed');
}

async function testConnection(apiKey) {
  const { data } = await axios.get('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 10000
  });
  return { model: data.data?.[0]?.id || 'qwen/qwen3.8-27b', message: `Connected. ${data.data?.length} models available.` };
}

module.exports = { id, name, envKeyName, models, getEnvKey, chat, testConnection };
