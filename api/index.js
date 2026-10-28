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

const postgres = require('../server/db/postgres');
const authRoutes = require('../server/routes/auth');
const dashboardRoutes = require('../server/routes/dashboard');
const customerRoutes = require('../server/routes/customers');
const productRoutes = require('../server/routes/products');
const orderRoutes = require('../server/routes/orders');
const waterRoutes = require('../server/routes/water');
const deliveryRoutes = require('../server/routes/deliveries');
const paymentRoutes = require('../server/routes/payments');
const reportRoutes = require('../server/routes/reports');
const settingRoutes = require('../server/routes/settings');

const app = express();
app.disable('x-powered-by');

// Security headers & CORS middleware
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json());

// Route mapping - mounts on both /api/... and /... to support all Vercel rewrite patterns
const routeModules = [
  ['/auth', authRoutes],
  ['/dashboard', dashboardRoutes],
  ['/customers', customerRoutes],
  ['/products', productRoutes],
  ['/orders', orderRoutes],
  ['/water', waterRoutes],
  ['/deliveries', deliveryRoutes],
  ['/payments', paymentRoutes],
  ['/reports', reportRoutes],
  ['/settings', settingRoutes]
];

routeModules.forEach(([mountPath, router]) => {
  app.use(`/api${mountPath}`, router);
  app.use(mountPath, router);
});

// Health check endpoint with live database connectivity verification
const healthHandler = async (req, res) => {
  const isPg = postgres.isPostgresConfigured();
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  let dbConnected = false;

  if (isPg) {
    const conn = await postgres.testConnection();
    dbConnected = Boolean(conn.ok);
  }

  res.json({
    status: isPg && !dbConnected ? 'degraded' : 'online',
    system: 'Ocean Enterprises Business Management System API (Vercel Serverless)',
    storage: isPg ? 'postgresql' : (isServerless ? 'ephemeral-json' : 'local-json'),
    database_configured: isPg,
    database_connected: isPg ? dbConnected : true,
    database: isPg ? (dbConnected ? 'connected' : 'disconnected') : 'json-store',
    persistent: isPg ? dbConnected : !isServerless,
    timestamp: new Date().toISOString()
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// 404 JSON handler for unknown API endpoints (Express 5 compatible)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl || req.path });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl || req.path });
});

// Global error handler - never leak stack traces, tokens, or database credentials
app.use((err, req, res, _next) => {
  console.error('Unhandled API error:', err.message);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

module.exports = app;
