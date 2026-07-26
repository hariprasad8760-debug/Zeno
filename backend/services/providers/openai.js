/* =============================================================================
   OpenAI Provider
   ============================================================================= */
const axios = require('axios');

const id         = 'openai';
const name       = 'OpenAI API';
const envKeyName = 'OPENAI_API_KEY';
const models     = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

function getEnvKey() { return process.env.OPENAI_API_KEY || ''; }

function buildMessages(message, systemPrompt, chatHistory, imageBase64) {
  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });

  for (const h of chatHistory.slice(-10)) {
    msgs.push({ role: h.role, content: h.content });
  }

  if (imageBase64) {
    msgs.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
        { type: 'text', text: message || 'Analyze this image.' }
      ]
    });
  } else {
    msgs.push({ role: 'user', content: message });
  }
  return msgs;
}

async function chat({ message, systemPrompt, chatHistory = [], imageBase64, apiKey }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const { data } = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model, messages: buildMessages(message, systemPrompt, chatHistory, imageBase64), max_tokens: 4096, temperature: 0.7 },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
  );
  return data.choices?.[0]?.message?.content || '';
}

async function testConnection(apiKey) {
  const { data } = await axios.get('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000
  });
  return { model: 'gpt-4o-mini', message: `Connected. ${data.data?.length} models available.` };
}

module.exports = { id, name, envKeyName, models, getEnvKey, chat, testConnection };
