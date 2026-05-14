const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Build CORS origin list from env (comma-separated). Supports CLIENT_URL or CORS_ORIGIN.
const corsOrigins = (process.env.CLIENT_URL || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOptions = corsOrigins.length > 0
  ? {
      origin: (origin, cb) => {
        if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
          return cb(null, true);
        }
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }
  : { origin: true, credentials: true };

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,                   // 20 AI requests per user per hour
  keyGenerator: (req) => {
    // Use user from JWT if available, otherwise IP
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return `user:${decoded.id || decoded.userId}`;
      } catch (_) {}
    }
    return req.ip;
  },
  message: { error: 'AI request limit reached. Maximum 20 AI requests per hour per user.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(generalLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dunning', require('./routes/dunning'));
app.use('/api/cash-applications', require('./routes/cashApplication'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/aging', require('./routes/aging'));
app.use('/api/ai', aiLimiter, require('./routes/ai'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/export', require('./routes/export'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/bulk', require('./routes/bulk'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

// BATCH_00_AUDIT_MOUNTS
app.use('/api/document-ocr', require('./routes/documentOcr'));
app.use('/api/vendor-health-monitor', require('./routes/vendorHealthMonitor'));
app.use('/api/payment-failure-prediction', require('./routes/paymentFailurePrediction'));
app.use('/api/tax-optimizer', require('./routes/taxOptimizer'));
app.use('/api/erp-bridge', require('./routes/erpBridge'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-ai-3-way-matching', require('./routes/gap_limited_ai_3_way_matching'));
app.use('/api/gap-ai-vendor-fraud-detection', require('./routes/gap_ai_vendor_fraud_detection'));
app.use('/api/gap-ai-duplicate-invoice-detection', require('./routes/gap_ai_duplicate_invoice_detection'));
app.use('/api/gap-ai-gl-coding-suggestion-invoice', require('./routes/gap_ai_gl_coding_suggestion_invoice'));
app.use('/api/gap-live-erp-connectors-sap-oracle', require('./routes/gap_live_erp_connectors_sap_oracle'));
app.use('/api/gap-native-payment-rail-processing-ach', require('./routes/gap_native_payment_rail_processing_ach'));
app.use('/api/gap-multi-currency-fx-handling', require('./routes/gap_multi_currency_fx_handling'));
app.use('/api/gap-notifications-subsystem', require('./routes/gap_notifications_subsystem'));
app.use('/api/gap-outbound-webhooks', require('./routes/gap_outbound_webhooks'));
