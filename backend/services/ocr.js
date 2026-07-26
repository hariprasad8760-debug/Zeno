/* =============================================================================
   OCR Service — Tesseract.js (runs locally, no cloud needed)
   ============================================================================= */

const { createWorker } = require('tesseract.js');

async function extractText(imagePath) {
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(imagePath);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

module.exports = { extractText };
