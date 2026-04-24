const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dunning', require('./routes/dunning'));
app.use('/api/cash-applications', require('./routes/cashApplication'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/aging', require('./routes/aging'));
app.use('/api/ai', require('./routes/ai'));
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
