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

// API Route Handlers
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Ocean Enterprises Business Management System API (Vercel Serverless)',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
