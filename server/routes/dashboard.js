const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // 1. Today's Total Orders
    const todayOrdersRes = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE date(order_date) = date('now')
    `).get();
    const todayOrdersCount = parseInt(todayOrdersRes?.count || 0, 10);

    // 2. Today's Water Quantity (from water_entries and water order items)
    const waterEntryRes = await db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total 
      FROM water_entries 
      WHERE date = date('now')
    `).get();
    const waterEntryQuantity = parseInt(waterEntryRes?.total || 0, 10);

    const orderWaterRes = await db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE date(o.order_date) = date('now')
        AND (p.category = 'Water' OR p.name LIKE '%Water%')
    `).get();
    const orderWaterQuantity = parseInt(orderWaterRes?.total || 0, 10);

    const todayWaterQuantity = waterEntryQuantity + orderWaterQuantity;

    // 3. Today's Beverage Orders / Units
    const todayBevOrdersRes = await db.prepare(`
      SELECT COUNT(DISTINCT o.id) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE date(o.order_date) = date('now')
        AND p.category = 'Beverage'
    `).get();
    const todayBeverageOrdersCount = parseInt(todayBevOrdersRes?.count || 0, 10);

    const todayBevUnitsRes = await db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE date(o.order_date) = date('now')
        AND p.category = 'Beverage'
    `).get();
    const todayBeverageUnits = parseInt(todayBevUnitsRes?.total || 0, 10);

    // 4. Pending Deliveries
    const pendingDelivRes = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE delivery_status IN ('New Order', 'Confirmed', 'Preparing', 'Out for Delivery')
    `).get();
    const pendingDeliveries = parseInt(pendingDelivRes?.count || 0, 10);

    // 5. Completed Deliveries Today
    const completedDelivRes = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM deliveries 
      WHERE status = 'Delivered' 
        AND date(COALESCE(delivered_at, created_at)) = date('now')
    `).get();
    const completedDeliveriesToday = parseInt(completedDelivRes?.count || 0, 10);

    // 6. Pending Payments (Amount & Count)
    const pendingOrderPayRes = await db.prepare(`
      SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total
      FROM orders 
      WHERE payment_status IN ('Pending', 'Partial') AND delivery_status != 'Cancelled'
    `).get();
    const pendingOrderPayments = parseFloat(pendingOrderPayRes?.total || 0);

    const pendingWaterPayRes = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM water_entries 
      WHERE payment_status = 'Pending'
    `).get();
    const pendingWaterPayments = parseFloat(pendingWaterPayRes?.total || 0);

    const totalPendingAmount = Math.round(pendingOrderPayments + pendingWaterPayments);

    // 7. Today's Total Sales
    const todayOrderSalesRes = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE date(order_date) = date('now') AND delivery_status != 'Cancelled'
    `).get();
    const todayOrderSales = parseFloat(todayOrderSalesRes?.total || 0);

    const todayWaterSalesRes = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM water_entries 
      WHERE date = date('now')
    `).get();
    const todayWaterSales = parseFloat(todayWaterSalesRes?.total || 0);

    const todayTotalSales = Math.round(todayOrderSales + todayWaterSales);

    // 8. Monthly Sales
    const monthlyOrderSalesRes = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
        AND delivery_status != 'Cancelled'
    `).get();
    const monthlyOrderSales = parseFloat(monthlyOrderSalesRes?.total || 0);

    const monthlyWaterSalesRes = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM water_entries 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `).get();
    const monthlyWaterSales = parseFloat(monthlyWaterSalesRes?.total || 0);

    const monthlySales = Math.round(monthlyOrderSales + monthlyWaterSales);

    // 9. Total Customers
    const totalCustRes = await db.prepare('SELECT COUNT(*) as count FROM customers').get();
    const totalCustomers = parseInt(totalCustRes?.count || 0, 10);

    // 10. Low Stock Alerts
    const lowStockProducts = await db.prepare(`
      SELECT id, name, category, size, stock, minimum_stock 
      FROM products 
      WHERE stock <= minimum_stock AND active = 1
      ORDER BY stock ASC
    `).all();

    // 11. Recent orders preview
    const recentOrders = await db.prepare(`
      SELECT o.id, o.order_number, o.total_amount, o.paid_amount, o.payment_status, 
             o.delivery_status, o.order_date, o.source,
             c.name as customer_name, c.business_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 6
    `).all();

    // 12. Delivery status breakdown
    const deliveryBreakdown = await db.prepare(`
      SELECT delivery_status, COUNT(*) as count
      FROM orders
      WHERE date(order_date) = date('now')
      GROUP BY delivery_status
    `).all();

    res.json({
      summary: {
        today_revenue: todayTotalSales,
        month_revenue: monthlySales,
        total_pending: totalPendingAmount
      },
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
      lowStockProducts: lowStockProducts || [],
      low_stock: lowStockProducts || [],
      recentOrders: (recentOrders || []).map(o => ({
        ...o,
        total_amount: parseFloat(o.total_amount) || 0,
        paid_amount: parseFloat(o.paid_amount) || 0
      })),
      recent_orders: (recentOrders || []).map(o => ({
        ...o,
        total_amount: parseFloat(o.total_amount) || 0,
        paid_amount: parseFloat(o.paid_amount) || 0
      })),
      pending_payments: [],
      deliveryBreakdown: deliveryBreakdown || []
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Error computing dashboard statistics' });
  }
});

module.exports = router;
