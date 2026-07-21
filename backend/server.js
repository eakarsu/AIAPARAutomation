const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { legacyPrototypeRoutesEnabled } = require('./config/runtime').validateRuntime();

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
    return ipKeyGenerator(req.ip);
  },
  message: { error: 'AI request limit reached. Maximum 20 AI requests per hour per user.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(generalLimiter);

app.use('/api', (req, res, next) => {
  const supported = ['/auth', '/health', '/invoice-posting-workflows'];
  if (legacyPrototypeRoutesEnabled || supported.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) return next();
  return res.status(410).json({ error: 'Legacy prototype route is quarantined', code: 'prototype_route_quarantined' });
});

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
app.use('/api/payment-run-approval-matrix', require('./routes/paymentRunApprovalMatrix'));
app.use('/api/invoice-posting-workflows', require('./routes/invoicePostingWorkflow'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

// Batch-generated stub and gap routes are intentionally not mounted as product APIs.

// Custom Views (AP/AR synthesized views: aging report, payment funnel, invoice PDF, approval workflow)
app.use('/api/custom-views', require('./routes/customViews'));
