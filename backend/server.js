/* =============================================================================
   Zeno AI Backend — Main Server (Express, No Database)
   Sessions stored in-memory. Chat history stored in frontend localStorage.
   ============================================================================= */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const aiRoutes   = require('./routes/ai');
const ocrRoutes  = require('./routes/ocr');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (file://, Postman, etc.), localhost and extensions
    if (
      !origin || 
      origin.startsWith('http://localhost') || 
      origin.startsWith('http://127.0.0.1') || 
      origin.startsWith('null') ||
      origin.startsWith('chrome-extension://')
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Static uploads folder (screenshots) ─────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files (from parent folder since frontend files are at root of Zeno folder)
app.use(express.static(path.join(__dirname, '..')));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/chat',      aiRoutes);
app.use('/api/ocr',       ocrRoutes);

// ── Provider test endpoint (direct on server for simplicity) ─────────────────
app.use('/api/providers', require('./routes/providers'));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    version: '1.0.0',
    time:    new Date().toISOString(),
    providers: {
      gemini:      !!process.env.GEMINI_API_KEY,
      openai:      !!process.env.OPENAI_API_KEY,
      groq:        !!process.env.GROQ_API_KEY,
      openrouter:  !!process.env.OPENROUTER_API_KEY,
      cohere:      !!process.env.COHERE_API_KEY,
    }
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Zeno Error]', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code:  err.code    || 'SERVER_ERROR'
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🧠 Zeno Backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Providers enabled:`);
  const envKeys = {
    Gemini: 'GEMINI_API_KEY', OpenAI: 'OPENAI_API_KEY',
    Groq: 'GROQ_API_KEY', OpenRouter: 'OPENROUTER_API_KEY', Cohere: 'COHERE_API_KEY'
  };
  Object.entries(envKeys).forEach(([name, key]) => {
    console.log(`     ${process.env[key] ? '✅' : '⬜'} ${name}`);
  });
  console.log('');
});
