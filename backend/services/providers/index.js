/* =============================================================================
   Provider Registry — Registers and returns provider implementations
   ============================================================================= */

const gemini     = require('./gemini');
const openai     = require('./openai');
const groq       = require('./groq');
const openrouter = require('./openrouter');
const cohere     = require('./cohere');

const registry = new Map([
  ['gemini',     gemini],
  ['openai',     openai],
  ['groq',       groq],
  ['openrouter', openrouter],
  ['cohere',     cohere],
]);

module.exports = {
  get:  (id) => registry.get(id),
  list: ()   => Array.from(registry.values()),
  has:  (id) => registry.has(id),
};
