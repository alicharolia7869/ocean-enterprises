const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/sales
router.get('/sales', authMiddleware, async (req, res) => {
  try {
    const { period } = req.query; // 'daily', 'weekly', 'monthly'

    const orders = await db.prepare("SELECT total_amount, order_date, created_at, delivery_status FROM orders WHERE delivery_status != 'Cancelled'").all();
    const waterEntries = await db.prepare("SELECT total_amount, quantity, date FROM water_entries").all();

    const now = new Date();
    const result = [];

    if (period === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7));
        const weekLabel = `Week of ${d.toISOString().slice(5, 10)}`;
        const start = new Date(d);
        start.setDate(d.getDate() - 6);
        const startStr = start.toISOString().slice(0, 10);
        const endStr = d.toISOString().slice(0, 10);

        const orderSales = (orders || [])
          .filter(o => {
            const date = (o.order_date ? String(o.order_date) : (o.created_at ? String(o.created_at) : '')).slice(0, 10);
            return date >= startStr && date <= endStr;
          })
          .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        const waterSales = (waterEntries || [])
          .filter(w => {
            const date = (w.date ? String(w.date) : '').slice(0, 10);
            return date >= startStr && date <= endStr;
          })
          .reduce((sum, w) => sum + (parseFloat(w.total_amount) || 0), 0);

        result.push({
          label: weekLabel,
          orderSales: Math.round(orderSales),
          waterSales: Math.round(waterSales),
          totalSales: Math.round(orderSales + waterSales)
        });
      }
    } else if (period === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toISOString().slice(0, 7);
        const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });

        const orderSales = (orders || [])
          .filter(o => (o.order_date ? String(o.order_date) : (o.created_at ? String(o.created_at) : '')).slice(0, 7) === monthKey)
          .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        const waterSales = (waterEntries || [])
          .filter(w => (w.date ? String(w.date) : '').slice(0, 7) === monthKey)
          .reduce((sum, w) => sum + (parseFloat(w.total_amount) || 0), 0);

        result.push({
          label: monthLabel,
          monthKey,
          orderSales: Math.round(orderSales),
          waterSales: Math.round(waterSales),
          totalSales: Math.round(orderSales + waterSales)
        });
      }
    } else {
      // Daily: Last 14 days
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const orderSales = (orders || [])
          .filter(o => (o.order_date ? String(o.order_date) : (o.created_at ? String(o.created_at) : '')).slice(0, 10) === dateStr)
          .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        const dailyWater = (waterEntries || []).filter(w => (w.date ? String(w.date) : '').slice(0, 10) === dateStr);
        const waterSales = dailyWater.reduce((sum, w) => sum + (parseFloat(w.total_amount) || 0), 0);
        const waterUnits = dailyWater.reduce((sum, w) => sum + (parseInt(w.quantity, 10) || 0), 0);

        result.push({
          date: dateStr,
          label,
          orderSales: Math.round(orderSales),
          waterSales: Math.round(waterSales),
          totalSales: Math.round(orderSales + waterSales),
          waterUnits
        });
      }
    }

    res.json({ salesData: result });
  } catch (err) {
    console.error('Error computing sales report:', err);
    res.status(500).json({ error: 'Error computing sales report' });
  }
});

// GET /api/reports/customer-wise
router.get('/customer-wise', authMiddleware, async (req, res) => {
  try {
    const customers = await db.prepare('SELECT id, name, business_name, phone FROM customers ORDER BY business_name ASC').all();
    const allOrders = await db.prepare("SELECT customer_id, total_amount, paid_amount FROM orders WHERE delivery_status != 'Cancelled'").all();
    const allWater = await db.prepare("SELECT customer_id, quantity, total_amount, payment_status FROM water_entries").all();

    const data = (customers || []).map(c => {
      const orders = (allOrders || []).filter(o => o.customer_id === c.id);
      const water = (allWater || []).filter(w => w.customer_id === c.id);

      const orderSales = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      const waterSales = water.reduce((sum, w) => sum + (parseFloat(w.total_amount) || 0), 0);
      const totalWaterUnits = water.reduce((sum, w) => sum + (parseInt(w.quantity, 10) || 0), 0);
      const totalSales = orderSales + waterSales;

      const orderPaid = orders.reduce((sum, o) => sum + (parseFloat(o.paid_amount) || 0), 0);
      const waterPaid = water.filter(w => w.payment_status === 'Paid').reduce((sum, w) => sum + (parseFloat(w.total_amount) || 0), 0);
      const totalPaid = orderPaid + waterPaid;
      const pending = Math.max(0, totalSales - totalPaid);

      return {
        customer_id: c.id,
        name: c.name,
        business_name: c.business_name,
        phone: c.phone,
        total_orders: orders.length,
        total_water_units: totalWaterUnits,
        total_sales: Math.round(totalSales),
        total_paid: Math.round(totalPaid),
        total_pending: Math.round(pending)
      };
    }).sort((a, b) => b.total_sales - a.total_sales);

    res.json({ customerWise: data });
  } catch (err) {
    console.error('Error generating customer-wise report:', err);
    res.status(500).json({ error: 'Error generating customer-wise report' });
  }
});

// GET /api/reports/product-wise
router.get('/product-wise', authMiddleware, async (req, res) => {
  try {
    const products = await db.prepare('SELECT * FROM products ORDER BY name ASC').all();
    const orderItems = await db.prepare(`
      SELECT oi.product_id, oi.quantity, oi.subtotal 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.delivery_status != 'Cancelled'
    `).all();
    const waterEntries = await db.prepare('SELECT product_id, quantity, total_amount FROM water_entries').all();

    const data = (products || []).map(p => {
      let unitsSold = 0;
      let revenue = 0;

      // From order items
      (orderItems || []).forEach(oi => {
        if (oi.product_id === p.id) {
          unitsSold += parseInt(oi.quantity, 10) || 0;
          revenue += parseFloat(oi.subtotal) || 0;
        }
      });

      // From water entries if water jar
      if (p.category === 'Water') {
        (waterEntries || []).forEach(w => {
          if (w.product_id === p.id || (!w.product_id && (p.name || '').includes('20L'))) {
            unitsSold += parseInt(w.quantity, 10) || 0;
            revenue += parseFloat(w.total_amount) || 0;
          }
        });
      }

      const purchasePrice = parseFloat(p.purchase_price) || 0;
      const estimatedCost = unitsSold * purchasePrice;
      const estimatedProfit = Math.max(0, revenue - estimatedCost);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        size: p.size,
        stock: parseInt(p.stock, 10) || 0,
        selling_price: parseFloat(p.selling_price) || 0,
        purchase_price: purchasePrice,
        units_sold: unitsSold,
        revenue: Math.round(revenue),
        profit: Math.round(estimatedProfit)
      };
    }).sort((a, b) => b.units_sold - a.units_sold);

    res.json({ productWise: data });
  } catch (err) {
    console.error('Error generating product-wise report:', err);
    res.status(500).json({ error: 'Error generating product-wise report' });
  }
});

module.exports = router;
