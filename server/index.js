const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({
    path: [
      path.join(__dirname, '..', '.env.local'),
      path.join(__dirname, '..', '.env')
    ],
    quiet: true
  });
} else {
  dotenv.config({ quiet: true });
}

const postgres = require('./db/postgres');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const waterRoutes = require('./routes/water');
const deliveryRoutes = require('./routes/deliveries');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;
app.disable('x-powered-by');

// Process error safety
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Middleware
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);

// Health check endpoint with live database connectivity verification
app.get('/api/health', async (req, res) => {
  const isPg = postgres.isPostgresConfigured();
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  let dbConnected = false;

  if (isPg) {
    const conn = await postgres.testConnection();
    dbConnected = Boolean(conn.ok);
  }

  res.json({
    status: isPg && !dbConnected ? 'degraded' : 'online',
    system: 'Ocean Enterprises Business Management System API',
    storage: isPg ? 'postgresql' : (isServerless ? 'ephemeral-json' : 'local-json'),
    database_configured: isPg,
    database_connected: isPg ? dbConnected : true,
    database: isPg ? (dbConnected ? 'connected' : 'disconnected') : 'json-store',
    persistent: isPg ? dbConnected : !isServerless,
    timestamp: new Date().toISOString()
  });
});

// Unmatched API requests must return 404 JSON (prevents returning index.html to API callers)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl || req.path });
});

// Serve frontend in production if built
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

app.use((req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Ocean Enterprises API</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #0A192F; color: #E6F1FF;">
            <h1 style="color: #05BFDB;">🌊 Ocean Enterprises Backend API</h1>
            <p>API Server is running on port ${PORT}.</p>
            <p><a href="/api/health" style="color: #05BFDB;">Check API Health</a></p>
          </body>
        </html>
      `);
    }
  });
});

// Global error handler - never leak stack traces, tokens, or database credentials
app.use((err, req, res, _next) => {
  console.error('Unhandled API error:', err.message);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`🌊 Ocean Enterprises API server running at http://localhost:${PORT}`);
});

module.exports = { app, server };
