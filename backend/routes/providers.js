/* =============================================================================
   Provider Test Route
   POST /api/providers/test — Test if an API key is valid
   GET  /api/providers      — List providers and which have env keys set
   ============================================================================= */

const express  = require('express');
const router   = express.Router();
const providers = require('../services/providers/index');

// GET /api/providers — List available providers + which have server keys
router.get('/', (req, res) => {
  const list = providers.list().map(p => ({
    id:       p.id,
    name:     p.name,
    models:   p.models,
    hasEnvKey: !!p.getEnvKey(),
  }));
  res.json({ providers: list });
});

// POST /api/providers/test — Test a provider's API key
router.post('/test', async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider required' });

  const service = providers.get(provider);
  if (!service) return res.status(400).json({ error: `Unknown provider: ${provider}` });

  const key = apiKey || service.getEnvKey();
  if (!key) {
    return res.status(400).json({ error: 'No API key provided', code: 'NO_API_KEY' });
  }

  try {
    const start  = Date.now();
    const result = await service.testConnection(key);
    const latency = Date.now() - start;

    res.json({ success: true, latency, model: result.model, message: result.message });
  } catch (err) {
    const msg = err.response?.data?.error?.message
             || err.response?.data?.message
             || err.message
             || 'Connection failed';
    res.status(400).json({ success: false, error: msg });
  }
});

module.exports = router;
