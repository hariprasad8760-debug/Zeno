/* =============================================================================
   AI Chat Route — Routes to correct provider based on request
   Supports automatic API key quota fallback rotation.
   POST /api/chat
   Body: { message, mode, provider, apiKey?, chatHistory?, imageBase64? }
   ============================================================================= */

const express = require('express');
const router  = express.Router();
const providers = require('../services/providers/index');

function parseKeys(rawKey) {
  if (!rawKey) return [];
  if (Array.isArray(rawKey)) return rawKey.map(k => String(k).trim()).filter(Boolean);
  if (typeof rawKey === 'string') {
    return rawKey.split(/[\n,;|]+/).map(k => k.trim()).filter(Boolean);
  }
  return [];
}

function isQuotaError(err) {
  const status = err.response?.status || err.status || err.statusCode;
  const msg = String(err.response?.data?.error?.message || err.response?.data?.message || err.message || '').toLowerCase();
  if (status === 429 || status === 403) return true;
  return /quota|limit|exceeded|resource_exhausted|rate_limit|credits|balance|429/i.test(msg);
}

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const {
      message,
      mode       = 'chat',
      provider   = process.env.DEFAULT_PROVIDER || 'gemini',
      apiKey,          // user-provided key(s)
      chatHistory = [],
      imageBase64,
      systemPrompt,
    } = req.body;

    if (!message && !imageBase64) {
      return res.status(400).json({ error: 'Message or image is required' });
    }



    // Build system prompt based on mode
    const systemMsg = systemPrompt || buildSystemPrompt(mode);

    // Get provider service
    const providerService = providers.get(provider);
    if (!providerService) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    // Resolve API keys list (from request body or env)
    const rawKeys = apiKey || providerService.getEnvKey();
    const keyList = parseKeys(rawKeys);

    if (!keyList.length) {
      const errorMsg = provider === 'gemini' 
        ? 'Gemini API key not configured.'
        : `No API key for provider "${provider}". Add it in Settings or set ${providerService.envKeyName} in backend/.env`;
      return res.status(400).json({
        error: errorMsg,
        code: 'NO_API_KEY'
      });
    }

    // Call provider with key rotation on quota error
    let lastErr = null;
    for (let i = 0; i < keyList.length; i++) {
      const currentKey = keyList[i];
      try {
        const response = await providerService.chat({
          message,
          systemPrompt: systemMsg,
          chatHistory,
          imageBase64,
          apiKey: currentKey,
        });

        return res.json({ response, provider, mode });
      } catch (err) {
        lastErr = err;
        if (isQuotaError(err) && i < keyList.length - 1) {
          console.warn(`[Backend Quota Rotation] Provider "${provider}" key #${i + 1} quota exhausted. Switching to key #${i + 2}...`);
          continue;
        }
        break;
      }
    }

    if (lastErr) {
      const status = lastErr.response?.status || lastErr.status;
      const errMsgText = String(lastErr.response?.data?.error?.message || lastErr.message || '').toLowerCase();
      const isAuthOrQuota = status === 401 || status === 403 || status === 429 || isQuotaError(lastErr) || errMsgText.includes('authentication') || errMsgText.includes('api key');

      if (isAuthOrQuota && provider !== 'groq') {
        const groqService = providers.get('groq');
        const groqKey = groqService?.getEnvKey() || process.env.GROQ_API_KEY;
        if (groqService && groqKey) {
          console.warn(`[Provider Fallback] Provider "${provider}" failed (${status || 'error'}). Falling back to Groq...`);
          try {
            const fallbackRes = await groqService.chat({
              message,
              systemPrompt: systemMsg,
              chatHistory,
              imageBase64,
              apiKey: groqKey
            });
            return res.json({ response: fallbackRes, provider: 'groq', mode, fallbackFrom: provider });
          } catch (groqErr) {
            console.error('[Provider Fallback] Groq fallback failed:', groqErr.message);
          }
        }
      }
      throw lastErr;
    }

  } catch (err) {
    console.error('[AI Route Error]', err.message);
    const status = err.response?.status || 500;
    const errMsg = err.response?.data?.error?.message
                || err.response?.data?.message
                || err.message
                || 'AI request failed';
    res.status(status).json({ error: errMsg, code: 'AI_ERROR' });
  }
});

function buildSystemPrompt(mode) {
  const base = `You are Zeno, an expert AI coding and vision assistant. You are precise, helpful, and concise.
Format your responses using clean markdown. Use code blocks with language identifiers for all code snippets.
When analyzing images, diagrams, error screenshots, or UI mockups:
- Inspect all visual elements, text, logs, and code thoroughly.
- Directly and completely answer the user's question or query about the image.
- If code errors or bugs are shown, explain the issue and provide the exact fixed code.
When providing step-by-step explanations, format each step clearly (e.g. Step 1: ..., Step 2: ...) with normal plain text and code blocks.
Do NOT use LaTeX math symbols, encrypted characters, or raw codes like $4/ for simple steps. Always output clean, normal text.
IMPORTANT: You do NOT generate or synthesize images. Image generation is disabled in Zeno. If a user asks to generate, create, or draw an image, politely inform them that you specialize in image analysis, visual inspection, code, and debugging rather than image generation.`;

  const modePrompts = {
    chat: base,

    explain_error: `${base}

You are in EXPLAIN ERROR mode.
When given code, images, and/or error messages, explain the errors line by line in clear steps followed by the solution.`,

    optimize: `${base}

You are in OPTIMIZE CODE mode.
When given code, simplify it in clear steps and provide the clean, optimized code.`,

    debug: `${base}

You are in DEBUG MODE.
When given source code, images, and/or error messages, identify the bugs step by step and return the correct fixed code.`,
  };

  return modePrompts[mode] || modePrompts.chat;
}

module.exports = router;
