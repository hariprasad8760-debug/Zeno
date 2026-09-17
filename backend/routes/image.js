/* =============================================================================
   Image Generation Route — Fast, high-quality image generation
   POST /api/image/generate
   Body: { prompt, width, height, style }
   ============================================================================= */

const express = require('express');
const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { prompt, width = 1024, height = 1024, style } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required for image generation.' });
    }

    const cleanPrompt = prompt.trim();
    const stylePrompt = style ? `${cleanPrompt}, ${style} style, highly detailed, photorealistic, 8k resolution, masterpiece` : cleanPrompt;
    const seed = Math.floor(Math.random() * 10000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(stylePrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

    const markdownResponse = `Here is your generated image:\n\n![${cleanPrompt}](${imageUrl})\n\n**Prompt:** *${cleanPrompt}*\n\n[⬇️ Click here to open / download full resolution image](${imageUrl})`;

    return res.json({
      success: true,
      imageUrl,
      prompt: cleanPrompt,
      response: markdownResponse,
      mode: 'image_generate'
    });
  } catch (err) {
    console.error('[Image Route Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to generate image' });
  }
});

module.exports = router;
