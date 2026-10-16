const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers - List all customers with computed financial metrics
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, type } = req.query;
    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as total_orders,
        (
          COALESCE((SELECT SUM(total_amount) FROM orders o WHERE o.customer_id = c.id AND o.delivery_status != 'Cancelled'), 0) +
          COALESCE((SELECT SUM(total_amount) FROM water_entries w WHERE w.customer_id = c.id), 0)
        ) as total_amount,
        (
          COALESCE((SELECT SUM(total_amount - paid_amount) FROM orders o WHERE o.customer_id = c.id AND o.payment_status != 'Paid'), 0) +
          COALESCE((SELECT SUM(total_amount) FROM water_entries w WHERE w.customer_id = c.id AND w.payment_status = 'Pending'), 0)
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

    const customers = db.prepare(query).all(...params);

    // Format customer response
    const formatted = customers.map(c => {
      const latestDate = [c.last_order_date, c.last_water_date].filter(Boolean).sort().reverse()[0] || null;
      return {
        ...c,
        total_amount: Math.round(c.total_amount),
        balance_pending: Math.round(c.balance_pending),
        payment_status: c.balance_pending <= 0 ? 'Paid' : 'Pending',
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
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Customer orders
    const orders = db.prepare(`
      SELECT o.*,
        (SELECT json_group_array(json_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'subtotal', oi.subtotal
        )) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.order_date DESC
    `).all(req.params.id);

    const parsedOrders = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items || '[]')
    }));

    // Customer water entries
    const waterEntries = db.prepare(`
      SELECT w.*, p.name as product_name, p.size as product_size
      FROM water_entries w
      LEFT JOIN products p ON w.product_id = p.id
      WHERE w.customer_id = ?
      ORDER BY w.date DESC, w.time DESC
    `).all(req.params.id);

    // Customer payments
    const payments = db.prepare(`
      SELECT * FROM payments 
      WHERE customer_id = ? 
      ORDER BY payment_date DESC
    `).all(req.params.id);

    // Monthly aggregates for this customer
    const monthlyStats = db.prepare(`
      SELECT 
        month,
        SUM(water_units) as total_water_units,
        SUM(order_count) as total_orders,
        SUM(sales) as total_sales,
        SUM(paid) as total_paid,
        SUM(pending) as total_pending
      FROM (
        -- Water entries
        SELECT 
          strftime('%Y-%m', date) as month,
          SUM(quantity) as water_units,
          0 as order_count,
          SUM(total_amount) as sales,
          SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) as paid,
          SUM(CASE WHEN payment_status = 'Pending' THEN total_amount ELSE 0 END) as pending
        FROM water_entries
        WHERE customer_id = ?
        GROUP BY strftime('%Y-%m', date)

        UNION ALL

        -- Regular orders
        SELECT 
          strftime('%Y-%m', order_date) as month,
          0 as water_units,
          COUNT(*) as order_count,
          SUM(total_amount) as sales,
          SUM(paid_amount) as paid,
          SUM(total_amount - paid_amount) as pending
        FROM orders
        WHERE customer_id = ? AND delivery_status != 'Cancelled'
        GROUP BY strftime('%Y-%m', order_date)
      )
      GROUP BY month
      ORDER BY month DESC
    `).all(req.params.id, req.params.id);

    // Calculate overall balance
    const totalSales = (monthlyStats || []).reduce((acc, m) => acc + (m.total_sales || 0), 0);
    const totalPaid = (monthlyStats || []).reduce((acc, m) => acc + (m.total_paid || 0), 0);
    const pendingBalance = Math.max(0, totalSales - totalPaid);

    res.json({
      customer: {
        ...customer,
        totalSales,
        totalPaid,
        pendingBalance,
        payment_status: pendingBalance <= 0 ? 'Paid' : 'Pending'
      },
      orders: parsedOrders,
      waterEntries,
      payments,
      monthlyStats
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ error: 'Error fetching customer profile' });
  }
});

// POST /api/customers - Create new customer
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes } = req.body;
    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Customer Name, Phone number and Address are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO customers (name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
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

    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Customer added successfully', customer: newCustomer });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Error creating customer' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes } = req.body;
    const update = db.prepare(`
      UPDATE customers 
      SET name = ?, business_name = ?, phone = ?, whatsapp_number = ?, address = ?, 
          latitude = ?, longitude = ?, customer_type = ?, notes = ?
      WHERE id = ?
    `);

    update.run(
      name,
      business_name,
      phone,
      whatsapp_number || phone,
      address,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      customer_type,
      notes,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json({ message: 'Customer updated successfully', customer: updated });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Error updating customer' });
  }
});

// POST /api/customers/:id/location - Quick GPS location capture
router.post('/:id/location', authMiddleware, (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    if (address) {
      db.prepare('UPDATE customers SET latitude = ?, longitude = ?, address = ? WHERE id = ?')
        .run(parseFloat(latitude), parseFloat(longitude), address, req.params.id);
    } else {
      db.prepare('UPDATE customers SET latitude = ?, longitude = ? WHERE id = ?')
        .run(parseFloat(latitude), parseFloat(longitude), req.params.id);
    }

    const updated = db.prepare('SELECT id, name, business_name, latitude, longitude, address FROM customers WHERE id = ?').get(req.params.id);
    res.json({ message: 'Customer GPS location saved successfully', customer: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error updating customer GPS location' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Customer removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting customer' });
  }
});

module.exports = router;
