const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function toIsoDateString(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

// GET /api/customers - List all customers with computed financial metrics
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.delivery_status != 'Cancelled') as total_orders,
        (
          COALESCE((SELECT SUM(total_amount) FROM orders o WHERE o.customer_id = c.id AND o.delivery_status != 'Cancelled'), 0) +
          COALESCE((SELECT SUM(total_amount) FROM water_entries w WHERE w.customer_id = c.id), 0)
        ) as total_amount,
        (
          COALESCE((SELECT SUM(total_amount - paid_amount) FROM orders o WHERE o.customer_id = c.id AND o.payment_status != 'Paid' AND o.delivery_status != 'Cancelled'), 0) +
          COALESCE((SELECT SUM(total_amount - COALESCE(paid_amount, 0)) FROM water_entries w WHERE w.customer_id = c.id AND w.payment_status != 'Paid'), 0)
        ) as balance_pending,
        (
          SELECT MAX(order_date) FROM orders o WHERE o.customer_id = c.id
        ) as last_order_date,
        (
          SELECT MAX(date) FROM water_entries w WHERE w.customer_id = c.id
        ) as last_water_date
      FROM customers c
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== 'All') {
      query += ` AND c.customer_type = ?`;
      params.push(type);
    }

    if (search) {
      query += ` AND (c.name LIKE ? OR c.business_name LIKE ? OR c.phone LIKE ? OR c.address LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY c.business_name ASC, c.name ASC`;

    const customers = await db.prepare(query).all(...params);

    // Format customer response
    const formatted = (customers || []).map(c => {
      const latestDate = [c.last_order_date, c.last_water_date].filter(Boolean).sort().reverse()[0] || null;
      const totalAmt = parseFloat(c.total_amount) || 0;
      const balancePending = parseFloat(c.balance_pending) || 0;
      return {
        ...c,
        total_amount: Math.round(totalAmt),
        balance_pending: Math.round(balancePending),
        payment_status: balancePending <= 0 ? 'Paid' : 'Pending',
        last_active_date: latestDate
      };
    });

    res.json({ customers: formatted });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Error fetching customers' });
  }
});

// GET /api/customers/:id - Detailed customer profile with order ledger & monthly breakdown
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Customer orders
    const rawOrders = await db.prepare(`
      SELECT * FROM orders 
      WHERE customer_id = ? 
      ORDER BY order_date DESC
    `).all(req.params.id);

    // Fetch order items for each order
    const parsedOrders = [];
    for (const o of rawOrders || []) {
      const items = await db.prepare(`
        SELECT * FROM order_items 
        WHERE order_id = ?
      `).all(o.id);
      parsedOrders.push({
        ...o,
        total_amount: parseFloat(o.total_amount) || 0,
        paid_amount: parseFloat(o.paid_amount) || 0,
        items: items || []
      });
    }

    // Customer water entries
    const waterEntries = await db.prepare(`
      SELECT w.*, p.name as product_name, p.size as product_size
      FROM water_entries w
      LEFT JOIN products p ON w.product_id = p.id
      WHERE w.customer_id = ?
      ORDER BY w.date DESC, w.created_at DESC
    `).all(req.params.id);

    // Customer payments
    const payments = await db.prepare(`
      SELECT * FROM payments 
      WHERE customer_id = ? 
      ORDER BY payment_date DESC
    `).all(req.params.id);

    // Compute monthly aggregates for customer in a dialect-agnostic manner
    const monthsMap = {};

    (waterEntries || []).forEach(w => {
      const m = toIsoDateString(w.date).slice(0, 7);
      if (!m) return;
      if (!monthsMap[m]) {
        monthsMap[m] = { month: m, total_water_units: 0, total_orders: 0, total_sales: 0, total_paid: 0, total_pending: 0 };
      }
      const qty = parseInt(w.quantity, 10) || 0;
      const amt = parseFloat(w.total_amount) || 0;
      const wPaid = w.payment_status === 'Paid' ? amt : Math.min(amt, parseFloat(w.paid_amount) || 0);
      const wPending = Math.max(0, amt - wPaid);
      monthsMap[m].total_water_units += qty;
      monthsMap[m].total_sales += amt;
      monthsMap[m].total_paid += wPaid;
      monthsMap[m].total_pending += wPending;
    });

    (parsedOrders || []).forEach(o => {
      if (o.delivery_status === 'Cancelled') return;
      const m = toIsoDateString(o.order_date || o.created_at).slice(0, 7);
      if (!m) return;
      if (!monthsMap[m]) {
        monthsMap[m] = { month: m, total_water_units: 0, total_orders: 0, total_sales: 0, total_paid: 0, total_pending: 0 };
      }
      const total = parseFloat(o.total_amount) || 0;
      const paid = parseFloat(o.paid_amount) || 0;
      monthsMap[m].total_orders += 1;
      monthsMap[m].total_sales += total;
      monthsMap[m].total_paid += paid;
      monthsMap[m].total_pending += Math.max(0, total - paid);
    });

    const monthlyStats = Object.values(monthsMap).sort((a, b) => b.month.localeCompare(a.month));

    // Calculate overall balance
    const totalSales = monthlyStats.reduce((acc, m) => acc + (m.total_sales || 0), 0);
    const totalPaid = monthlyStats.reduce((acc, m) => acc + (m.total_paid || 0), 0);
    const pendingBalance = Math.max(0, totalSales - totalPaid);

    res.json({
      customer: {
        ...customer,
        totalSales: Math.round(totalSales),
        total_sales: Math.round(totalSales),
        totalPaid: Math.round(totalPaid),
        total_paid: Math.round(totalPaid),
        pendingBalance: Math.round(pendingBalance),
        pending_balance: Math.round(pendingBalance),
        payment_status: pendingBalance <= 0 ? 'Paid' : 'Pending'
      },
      orders: parsedOrders,
      waterEntries: waterEntries || [],
      payments: payments || [],
      monthlyStats
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ error: 'Error fetching customer profile' });
  }
});

// POST /api/customers - Create new customer
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes } = req.body;
    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Customer Name, Phone number and Address are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO customers (name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await insert.run(
      name.trim(),
      (business_name || '').trim(),
      phone.trim(),
      (whatsapp_number || phone).trim(),
      address.trim(),
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      customer_type || 'Shop',
      notes || ''
    );

    const newCustomer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Customer added successfully', customer: newCustomer });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Error creating customer' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes } = req.body;
    const nextPhone = phone !== undefined ? phone : existing.phone;
    const update = db.prepare(`
      UPDATE customers 
      SET name = ?, business_name = ?, phone = ?, whatsapp_number = ?, address = ?, 
          latitude = ?, longitude = ?, customer_type = ?, notes = ?
      WHERE id = ?
    `);

    await update.run(
      name !== undefined ? name : existing.name,
      business_name !== undefined ? business_name : existing.business_name,
      nextPhone,
      whatsapp_number !== undefined ? (whatsapp_number || nextPhone) : (existing.whatsapp_number || nextPhone),
      address !== undefined ? address : existing.address,
      latitude !== undefined ? (latitude !== null && latitude !== '' ? parseFloat(latitude) : null) : existing.latitude,
      longitude !== undefined ? (longitude !== null && longitude !== '' ? parseFloat(longitude) : null) : existing.longitude,
      customer_type !== undefined ? customer_type : existing.customer_type,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const updated = await db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json({ message: 'Customer updated successfully', customer: updated });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Error updating customer' });
  }
});

// POST /api/customers/:id/location - Quick GPS location capture
router.post('/:id/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    if (address) {
      await db.prepare('UPDATE customers SET latitude = ?, longitude = ?, address = ? WHERE id = ?')
        .run(parseFloat(latitude), parseFloat(longitude), address, req.params.id);
    } else {
      await db.prepare('UPDATE customers SET latitude = ?, longitude = ? WHERE id = ?')
        .run(parseFloat(latitude), parseFloat(longitude), req.params.id);
    }

    const updated = await db.prepare('SELECT id, name, business_name, latitude, longitude, address FROM customers WHERE id = ?').get(req.params.id);
    res.json({ message: 'Customer GPS location saved successfully', customer: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error updating customer GPS location' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Customer removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting customer' });
  }
});

module.exports = router;
