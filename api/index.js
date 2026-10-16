const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

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

// Middleware
app.use(cors());
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

// Health check endpoint
const healthHandler = (req, res) => {
  res.json({
    status: 'online',
    system: 'Ocean Enterprises Business Management System API (Vercel Serverless)',
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

module.exports = app;

