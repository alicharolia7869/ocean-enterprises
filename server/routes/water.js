const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/water - List water entries with filters
router.get('/', authMiddleware, (req, res) => {
  try {
    const { date, customerId, month } = req.query;
    let query = `
      SELECT w.*, c.name as customer_name, c.business_name, c.phone as customer_phone, c.address as customer_address,
             p.name as product_name, p.size as product_size
      FROM water_entries w
      JOIN customers c ON w.customer_id = c.id
      LEFT JOIN products p ON w.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND w.date = ?`;
      params.push(date);
    }

    if (customerId) {
      query += ` AND w.customer_id = ?`;
      params.push(customerId);
    }

    if (month) {
      query += ` AND strftime('%Y-%m', w.date) = ?`;
      params.push(month);
    }

    query += ` ORDER BY w.date DESC, w.created_at DESC`;

    const entries = db.prepare(query).all(...params);
    res.json({ entries });
  } catch (err) {
    console.error('Error fetching water entries:', err);
    res.status(500).json({ error: 'Error fetching water entries' });
  }
});

// GET /api/water/summary - Today's Water metrics & Customer Monthly Water Summary
router.get('/summary', authMiddleware, (req, res) => {
  try {
    const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

    // Today's total water distributed (jars)
    const todayStats = db.prepare(`
      SELECT 
        COALESCE(SUM(quantity), 0) as total_units,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COUNT(DISTINCT customer_id) as total_customers_served
      FROM water_entries
      WHERE date = date('now')
    `).get();

    // Customer Monthly Water Summary
    const monthlySummary = db.prepare(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.business_name,
        c.phone as customer_phone,
        c.address,
        COALESCE(SUM(w.quantity), 0) as total_water_units,
        COALESCE(SUM(w.total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN w.payment_status = 'Paid' THEN w.total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN w.payment_status = 'Pending' THEN w.total_amount ELSE 0 END), 0) as pending_amount,
        COUNT(w.id) as delivery_days,
        MAX(w.date) as last_water_date
      FROM customers c
      JOIN water_entries w ON c.id = w.customer_id
      WHERE strftime('%Y-%m', w.date) = ?
      GROUP BY c.id
      ORDER BY total_water_units DESC
    `).all(selectedMonth);

    res.json({
      selectedMonth,
      todayStats: {
        totalUnits: todayStats.total_units,
        totalAmount: Math.round(todayStats.total_amount),
        customersServed: todayStats.total_customers_served
      },
      monthlySummary
    });
  } catch (err) {
    console.error('Error fetching water summary:', err);
    res.status(500).json({ error: 'Error fetching water statistics' });
  }
});

// POST /api/water - Rapid Water Entry (Ultra-fast 10-20 sec workflow)
router.post('/', authMiddleware, (req, res) => {
  try {
    const { customer_id, product_id, quantity, price, payment_status, date, time, notes, payment_mode } = req.body;
    if (!customer_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Customer and valid Quantity are required' });
    }

    // Default product if not provided: 20L Water Jar
    let prodId = product_id;
    let unitPrice = price;

    if (!prodId) {
      const defaultWater = db.prepare("SELECT id, selling_price FROM products WHERE category = 'Water' AND name LIKE '%20L%' LIMIT 1").get();
      if (defaultWater) {
        prodId = defaultWater.id;
        if (unitPrice === undefined || unitPrice === null) {
          unitPrice = defaultWater.selling_price;
        }
      } else {
        unitPrice = unitPrice || 35;
      }
    }

    const qty = parseInt(quantity, 10);
    const itemPrice = parseFloat(unitPrice || 35);
    const totalAmount = Math.round(qty * itemPrice);
    const entryDate = date || new Date().toISOString().slice(0, 10);
    const entryTime = time || new Date().toTimeString().slice(0, 8);
    const status = payment_status || 'Pending';

    // Insert water entry
    const insert = db.prepare(`
      INSERT INTO water_entries (customer_id, product_id, quantity, price, total_amount, payment_status, date, time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      customer_id,
      prodId,
      qty,
      itemPrice,
      totalAmount,
      status,
      entryDate,
      entryTime,
      notes || ''
    );

    const waterEntryId = result.lastInsertRowid;

    // Auto deduct inventory
    if (prodId) {
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(qty, prodId);
    }

    // If marked Paid, auto record payment
    if (status === 'Paid') {
      db.prepare(`
        INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, payment_date, status, notes)
        VALUES (?, NULL, ?, ?, ?, datetime('now'), 'Completed', ?)
      `).run(customer_id, waterEntryId, totalAmount, payment_mode || 'Cash', `Rapid Water Entry #${waterEntryId}`);
    }

    // Fetch created entry with details
    const created = db.prepare(`
      SELECT w.*, c.name as customer_name, c.business_name, c.phone as customer_phone, c.address as customer_address
      FROM water_entries w
      JOIN customers c ON w.customer_id = c.id
      WHERE w.id = ?
    `).get(waterEntryId);

    // Compute updated customer pending balance
    const customerPending = db.prepare(`
      SELECT 
        COALESCE((SELECT SUM(total_amount - paid_amount) FROM orders WHERE customer_id = ? AND payment_status != 'Paid'), 0) +
        COALESCE((SELECT SUM(total_amount) FROM water_entries WHERE customer_id = ? AND payment_status = 'Pending'), 0) as pending
    `).get(customer_id, customer_id).pending;

    res.status(201).json({
      message: 'Water supply recorded successfully',
      entry: created,
      customerPendingBalance: Math.round(customerPending)
    });
  } catch (err) {
    console.error('Error creating water entry:', err);
    res.status(500).json({ error: 'Error saving water entry' });
  }
});

// DELETE /api/water/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM water_entries WHERE id = ?').get(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Restore product stock
    if (entry.product_id) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(entry.quantity, entry.product_id);
    }

    // Delete associated payment if any
    db.prepare('DELETE FROM payments WHERE water_entry_id = ?').run(req.params.id);

    // Delete entry
    db.prepare('DELETE FROM water_entries WHERE id = ?').run(req.params.id);

    res.json({ message: 'Water entry deleted and inventory restored' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting water entry' });
  }
});

module.exports = router;
