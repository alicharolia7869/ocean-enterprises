const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

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

// Process error safety
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Middleware
app.use(cors());
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Ocean Enterprises Business Management System API',
    storage: require('./db/postgres').isPostgresConfigured() ? 'postgresql' : (Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) ? 'ephemeral-json' : 'local-json'),
    database_configured: require('./db/postgres').isPostgresConfigured(),
    persistent: require('./db/postgres').isPostgresConfigured() || !Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
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

const server = app.listen(PORT, () => {
  console.log(`🌊 Ocean Enterprises API server running at http://localhost:${PORT}`);
});

module.exports = { app, server };
