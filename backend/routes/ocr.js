/* =============================================================================
   OCR Route — Extract text from uploaded images using Tesseract.js
   POST /api/ocr  (multipart form: image file)
   POST /api/ocr/base64 (JSON: { imageBase64, mimeType })
   ============================================================================= */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const ocrService = require('../services/ocr');

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// POST /api/ocr — file upload
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    const text = await ocrService.extractText(req.file.path);
    // Cleanup uploaded file after OCR
    fs.unlink(req.file.path, () => {});
    res.json({ text, charCount: text.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'OCR failed' });
  }
});

// POST /api/ocr/base64 — base64 image
router.post('/base64', async (req, res) => {
  const { imageBase64, mimeType = 'image/png' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  try {
    // Write to temp file
    const buffer   = Buffer.from(imageBase64, 'base64');
    const tempPath = path.join(__dirname, '..', 'uploads', `temp_${Date.now()}.png`);
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tempPath, buffer);

    const text = await ocrService.extractText(tempPath);
    fs.unlink(tempPath, () => {});
    res.json({ text, charCount: text.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'OCR failed' });
  }
});

module.exports = router;
