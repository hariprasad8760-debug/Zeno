/* =============================================================================
   Image Generation Route — Fast, high-quality image generation
   POST /api/image/generate
   Body: { prompt, width, height, style }
   ============================================================================= */

const express = require('express');
const router = express.Router();

router.post('/generate', async (req, res) => {
  return res.status(400).json({
    error: 'Image generation is disabled. Zeno is an AI vision and code analysis assistant.',
    code: 'IMAGE_GENERATION_DISABLED'
  });
});

module.exports = router;
