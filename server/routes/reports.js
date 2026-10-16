const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/sales
router.get('/sales', authMiddleware, (req, res) => {
  try {
    const store = db._getStore();
    const { period } = req.query; // 'daily', 'weekly', 'monthly'

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

        const orderSales = store.orders
          .filter(o => {
            const date = (o.order_date || o.created_at || '').slice(0, 10);
            return date >= startStr && date <= endStr && o.delivery_status !== 'Cancelled';
          })
          .reduce((sum, o) => sum + (o.total_amount || 0), 0);

        const waterSales = store.water_entries
          .filter(w => w.date >= startStr && w.date <= endStr)
          .reduce((sum, w) => sum + (w.total_amount || 0), 0);

        result.push({
          label: weekLabel,
          orderSales,
          waterSales,
          totalSales: orderSales + waterSales
        });
      }
    } else if (period === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toISOString().slice(0, 7);
        const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });

        const orderSales = store.orders
          .filter(o => (o.order_date || o.created_at || '').slice(0, 7) === monthKey && o.delivery_status !== 'Cancelled')
          .reduce((sum, o) => sum + (o.total_amount || 0), 0);

        const waterSales = store.water_entries
          .filter(w => (w.date || '').slice(0, 7) === monthKey)
          .reduce((sum, w) => sum + (w.total_amount || 0), 0);

        result.push({
          label: monthLabel,
          monthKey,
          orderSales,
          waterSales,
          totalSales: orderSales + waterSales
        });
      }
    } else {
      // Daily: Last 14 days
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const orderSales = store.orders
          .filter(o => (o.order_date || o.created_at || '').slice(0, 10) === dateStr && o.delivery_status !== 'Cancelled')
          .reduce((sum, o) => sum + (o.total_amount || 0), 0);

        const waterSales = store.water_entries
          .filter(w => w.date === dateStr)
          .reduce((sum, w) => sum + (w.total_amount || 0), 0);

        const waterUnits = store.water_entries
          .filter(w => w.date === dateStr)
          .reduce((sum, w) => sum + (w.quantity || 0), 0);

        result.push({
          date: dateStr,
          label,
          orderSales,
          waterSales,
          totalSales: orderSales + waterSales,
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
router.get('/customer-wise', authMiddleware, (req, res) => {
  try {
    const store = db._getStore();
    const data = store.customers.map(c => {
      const orders = store.orders.filter(o => o.customer_id === c.id && o.delivery_status !== 'Cancelled');
      const water = store.water_entries.filter(w => w.customer_id === c.id);

      const orderSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const waterSales = water.reduce((sum, w) => sum + (w.total_amount || 0), 0);
      const totalWaterUnits = water.reduce((sum, w) => sum + (w.quantity || 0), 0);
      const totalSales = orderSales + waterSales;

      const orderPaid = orders.reduce((sum, o) => sum + (o.paid_amount || 0), 0);
      const waterPaid = water.filter(w => w.payment_status === 'Paid').reduce((sum, w) => sum + (w.total_amount || 0), 0);
      const totalPaid = orderPaid + waterPaid;

      const pending = Math.max(0, totalSales - totalPaid);

      return {
        id: c.id,
        name: c.name,
        business_name: c.business_name,
        customer_type: c.customer_type,
        phone: c.phone,
        orders_count: orders.length,
        water_units: totalWaterUnits,
        total_sales: Math.round(totalSales),
        total_paid: Math.round(totalPaid),
        total_pending: Math.round(pending)
      };
    }).sort((a, b) => b.total_sales - a.total_sales);

    res.json({ customerWise: data });
  } catch (err) {
    res.status(500).json({ error: 'Error generating customer-wise report' });
  }
});

// GET /api/reports/product-wise
router.get('/product-wise', authMiddleware, (req, res) => {
  try {
    const store = db._getStore();
    const data = store.products.map(p => {
      let unitsSold = 0;
      let revenue = 0;

      // From order items
      store.order_items.forEach(oi => {
        if (oi.product_id === p.id) {
          const ord = store.orders.find(o => o.id === oi.order_id);
          if (ord && ord.delivery_status !== 'Cancelled') {
            unitsSold += oi.quantity || 0;
            revenue += oi.subtotal || 0;
          }
        }
      });

      // From water entries if water jar
      if (p.category === 'Water') {
        store.water_entries.forEach(w => {
          if (w.product_id === p.id || (!w.product_id && p.name.includes('20L'))) {
            unitsSold += w.quantity || 0;
            revenue += w.total_amount || 0;
          }
        });
      }

      const estimatedCost = unitsSold * (p.purchase_price || 0);
      const estimatedProfit = Math.max(0, revenue - estimatedCost);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        size: p.size,
        stock: p.stock,
        selling_price: p.selling_price,
        purchase_price: p.purchase_price,
        units_sold: unitsSold,
        revenue: Math.round(revenue),
        profit: Math.round(estimatedProfit)
      };
    }).sort((a, b) => b.units_sold - a.units_sold);

    res.json({ productWise: data });
  } catch (err) {
    res.status(500).json({ error: 'Error generating product-wise report' });
  }
});

module.exports = router;
