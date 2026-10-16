const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, (req, res) => {
  try {
    // 1. Today's Total Orders
    const todayOrdersCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE date(order_date) = date('now')
    `).get().count;

    // 2. Today's Water Quantity
    const waterEntryQuantity = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total 
      FROM water_entries 
      WHERE date = date('now')
    `).get().total;

    const orderWaterQuantity = db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE date(o.order_date) = date('now')
        AND (p.category = 'Water' OR p.name LIKE '%Water%')
    `).get().total;

    const todayWaterQuantity = waterEntryQuantity + orderWaterQuantity;

    // 3. Today's Beverage Orders / Units
    const todayBeverageOrdersCount = db.prepare(`
      SELECT COUNT(DISTINCT o.id) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE date(o.order_date) = date('now')
        AND p.category = 'Beverage'
    `).get().count;

    const todayBeverageUnits = db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE date(o.order_date) = date('now')
        AND p.category = 'Beverage'
    `).get().total;

    // 4. Pending Deliveries
    const pendingDeliveries = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE delivery_status IN ('New Order', 'Confirmed', 'Preparing', 'Out for Delivery')
    `).get().count;

    // 5. Completed Deliveries Today
    const completedDeliveriesToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM deliveries 
      WHERE status = 'Delivered' 
        AND date(COALESCE(delivered_at, created_at)) = date('now')
    `).get().count;

    // 6. Pending Payments (Amount & Count)
    const pendingOrderPayments = db.prepare(`
      SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total
      FROM orders 
      WHERE payment_status IN ('Pending', 'Partial')
    `).get().total;

    const pendingWaterPayments = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM water_entries 
      WHERE payment_status = 'Pending'
    `).get().total;

    const totalPendingAmount = Math.round(pendingOrderPayments + pendingWaterPayments);

    // 7. Today's Total Sales
    const todayOrderSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE date(order_date) = date('now') AND delivery_status != 'Cancelled'
    `).get().total;

    const todayWaterSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM water_entries 
      WHERE date = date('now')
    `).get().total;

    const todayTotalSales = Math.round(todayOrderSales + todayWaterSales);

    // 8. Monthly Sales
    const monthlyOrderSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
        AND delivery_status != 'Cancelled'
    `).get().total;

    const monthlyWaterSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM water_entries 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `).get().total;

    const monthlySales = Math.round(monthlyOrderSales + monthlyWaterSales);

    // 9. Total Customers
    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

    // 10. Low Stock Alerts
    const lowStockProducts = db.prepare(`
      SELECT id, name, category, size, stock, minimum_stock 
      FROM products 
      WHERE stock <= minimum_stock AND active = 1
      ORDER BY stock ASC
    `).all();

    // 11. Recent orders preview
    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.total_amount, o.paid_amount, o.payment_status, 
             o.delivery_status, o.order_date, o.source,
             c.name as customer_name, c.business_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 6
    `).all();

    // 12. Delivery status breakdown
    const deliveryBreakdown = db.prepare(`
      SELECT delivery_status, COUNT(*) as count
      FROM orders
      WHERE date(order_date) = date('now')
      GROUP BY delivery_status
    `).all();

    res.json({
      todayOrdersCount,
      todayWaterQuantity,
      todayBeverageOrdersCount,
      todayBeverageUnits,
      pendingDeliveries,
      completedDeliveriesToday,
      totalPendingAmount,
      todayTotalSales,
      monthlySales,
      totalCustomers,
      lowStockProducts,
      recentOrders,
      deliveryBreakdown
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Error computing dashboard statistics' });
  }
});

module.exports = router;
