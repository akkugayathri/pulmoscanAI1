/**
 * PulmoScan AI — Node.js Backend
 * Updated: handles invalid X-ray response from Python API
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const axios      = require('axios');
const FormData   = require('form-data');
const mongoose   = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3001;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';
const MONGO_URI      = process.env.MONGO_URI || 'mongodb://localhost:27017/pulmoscan';
const MAX_MB         = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: `${MAX_MB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${MAX_MB}mb` }));

// ─── Multer (in-memory storage) ───────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only JPEG, PNG, or WebP images are accepted (got ${file.mimetype})`));
    }
  },
});

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log(`[DB] Connected to MongoDB`))
  .catch(err => console.warn(`[DB] MongoDB connection failed: ${err.message}`));

const patientSchema = new mongoose.Schema({
  scanId:            { type: String, default: uuidv4 },
  patient: {
    fullName:        String,
    age:             Number,
    gender:          String,
    phone:           String,
    email:           String,
    symptoms:        [String],
    otherSymptoms:   String,
    existingConditions: String,
  },
  result: {
    predictedClass:  String,
    confidence:      Number,
    severity:        String,
    probabilities:   Object,
    affectedRegions: [String],
    recommendations: [String],
    demoMode:        Boolean,
  },
  imageMeta: {
    originalName:    String,
    mimetype:        String,
    sizeBytes:       Number,
  },
  createdAt: { type: Date, default: Date.now },
});

const ScanRecord = mongoose.model('ScanRecord', patientSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function callPythonAPI(imageBuffer, originalname, mimetype) {
  const form = new FormData();
  form.append('image', imageBuffer, { filename: originalname, contentType: mimetype });

  const response = await axios.post(`${PYTHON_API_URL}/api/predict`, form, {
    headers: form.getHeaders(),
    timeout: 60_000,
    maxContentLength: 50 * 1024 * 1024,
    // IMPORTANT: Don't throw on 4xx — let us handle invalid_xray manually
    validateStatus: (status) => status < 500,
  });
  return response;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  let pythonStatus = 'unknown';
  let pythonData   = null;
  try {
    const r = await axios.get(`${PYTHON_API_URL}/api/health`, { timeout: 5000 });
    pythonStatus = 'ok';
    pythonData   = r.data;
  } catch {
    pythonStatus = 'unreachable';
  }

  res.json({
    node:   { status: 'ok', uptime: process.uptime() },
    python: { status: pythonStatus, ...pythonData },
    mongo:  { status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' },
  });
});

/**
 * POST /api/diagnose
 * Main diagnosis endpoint
 * Now handles invalid X-ray rejection from Python API
 */
app.post('/api/diagnose', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required (field name: image)' });
    }

    // Parse patient data
    let patient = {};
    if (req.body.patientData) {
      try {
        patient = JSON.parse(req.body.patientData);
      } catch {
        return res.status(400).json({ error: 'patientData must be valid JSON' });
      }
    }

    // Call Python inference API
    let pythonResponse;
    try {
      pythonResponse = await callPythonAPI(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    } catch (err) {
      console.error('[AI] Python API call failed:', err.message);
      return res.status(502).json({
        error: 'AI inference service is unavailable.',
        detail: err.message,
      });
    }

    // ── Handle invalid X-ray response from Python ──────────────────────────
    if (pythonResponse.status === 400 &&
        pythonResponse.data?.error === 'invalid_xray') {
      console.warn('[VALIDATE] Invalid X-ray image rejected');
      // Do NOT save to MongoDB — return clean error to frontend
      return res.status(400).json({
        status: 'invalid_input',
        message: 'The uploaded image is not a valid chest X-ray. Please upload a proper lung X-ray image.',
        detail: pythonResponse.data?.detail || null,
      });
    }

    // ── If any other 4xx error from Python ────────────────────────────────
    if (pythonResponse.status >= 400) {
      return res.status(502).json({
        error: 'AI inference returned an error',
        detail: pythonResponse.data,
      });
    }

    const aiResult = pythonResponse.data;

    // ── Save to MongoDB ONLY for valid X-ray predictions ──────────────────
    const scanId = uuidv4();
    try {
      await ScanRecord.create({
        scanId,
        patient,
        result: {
          predictedClass:  aiResult.predicted_class,
          confidence:      aiResult.confidence,
          severity:        aiResult.severity,
          probabilities:   aiResult.probabilities,
          affectedRegions: aiResult.affected_regions,
          recommendations: aiResult.recommendations,
          demoMode:        aiResult.demo_mode,
        },
        imageMeta: {
          originalName: req.file.originalname,
          mimetype:     req.file.mimetype,
          sizeBytes:    req.file.size,
        },
      });
      console.log(`[DB] Saved scan ${scanId} for ${patient.fullName || 'anonymous'}`);
    } catch (dbErr) {
      console.warn('[DB] Failed to persist scan record:', dbErr.message);
    }

    // Return response to frontend
    return res.json({
      scanId,
      predicted_class:  aiResult.predicted_class,
      confidence:       aiResult.confidence,
      severity:         aiResult.severity || _inferSeverity(aiResult.predicted_class),
      probabilities:    aiResult.probabilities,
      affected_regions: aiResult.affected_regions,
      recommendations:  aiResult.recommendations,
      demo_mode:        aiResult.demo_mode || false,
      created_at:       new Date().toISOString(),
    });

  } catch (err) {
    console.error('[DIAGNOSE]', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.class) filter['result.predictedClass'] = req.query.class;

    const [records, total] = await Promise.all([
      ScanRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ScanRecord.countDocuments(filter),
    ]);

    res.json({ records, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const [classDist, total, recent] = await Promise.all([
      ScanRecord.aggregate([
        { $group: { _id: '$result.predictedClass', count: { $sum: 1 },
                    avgConfidence: { $avg: '$result.confidence' } } },
        { $sort: { count: -1 } },
      ]),
      ScanRecord.countDocuments(),
      ScanRecord.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      }),
    ]);

    res.json({
      totalScans:        total,
      scansThisWeek:     recent,
      classDistribution: classDist.map(d => ({
        class:         d._id,
        count:         d.count,
        avgConfidence: Math.round(d.avgConfidence * 10000) / 100,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/:scanId', async (req, res) => {
  try {
    await ScanRecord.deleteOne({ scanId: req.params.scanId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _inferSeverity(cls) {
  if (!cls || cls === 'Normal') return 'Low';
  if (['Tuberculosis', 'COVID-19'].includes(cls)) return 'High';
  return 'Medium';
}

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Maximum is ${MAX_MB} MB.` });
  }
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 PulmoScan Node.js Backend`);
  console.log(`   Listening on  : http://localhost:${PORT}`);
  console.log(`   Python API    : ${PYTHON_API_URL}`);
  console.log(`   MongoDB       : ${MONGO_URI}\n`);
});
