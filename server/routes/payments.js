const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/payments - Payment history & pending ledgers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { mode, customerId } = req.query;

    let query = `
      SELECT p.*, c.name as customer_name, c.business_name, c.phone as customer_phone, o.order_number
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      query += ` AND p.customer_id = ?`;
      params.push(parseInt(customerId, 10));
    }

    if (mode && mode !== 'All') {
      query += ` AND p.payment_mode = ?`;
      params.push(mode);
    }

    query += ` ORDER BY p.payment_date DESC`;

    const payments = await db.prepare(query).all(...params);

    // Outstanding balances list for reminder sending
    const customers = await db.prepare(`
      SELECT c.id as customer_id, c.name as customer_name, c.business_name, c.phone, c.whatsapp_number,
        (
          COALESCE((SELECT SUM(o.total_amount - o.paid_amount) FROM orders o WHERE o.customer_id = c.id AND o.payment_status != 'Paid' AND o.delivery_status != 'Cancelled'), 0) +
          COALESCE((SELECT SUM(w.total_amount - COALESCE(w.paid_amount, 0)) FROM water_entries w WHERE w.customer_id = c.id AND w.payment_status != 'Paid'), 0)
        ) as total_pending
      FROM customers c
      ORDER BY c.business_name ASC
    `).all();

    const pendingCustomers = (customers || [])
      .map(c => {
        const totalPending = Math.round(parseFloat(c.total_pending ?? c.balance_pending) || 0);
        return {
          customer_id: c.customer_id ?? c.id,
          customer_name: c.customer_name ?? c.name,
          business_name: c.business_name,
          phone: c.phone,
          whatsapp_number: c.whatsapp_number || c.phone,
          totalPending,
          total_pending: totalPending,
          hasPending: totalPending > 0
        };
      })
      .filter(c => c.hasPending)
      .sort((a, b) => b.totalPending - a.totalPending);

    res.json({
      payments: (payments || []).map(p => ({
        ...p,
        amount: parseFloat(p.amount) || 0
      })),
      pendingCustomers
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Error fetching payments' });
  }
});

// POST /api/payments - Record standalone payment (supports partial and full settlement across orders & water entries)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { customer_id, order_id, water_entry_id, amount, payment_mode, notes } = req.body;
    if (!customer_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Customer and valid payment amount are required' });
    }

    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const payAmount = parseFloat(amount);
    const mode = payment_mode || 'Cash';

    const result = await db.transaction(async (tx) => {
      let paymentRes;
      if (water_entry_id) {
        const insertWaterPay = tx.prepare(`
          INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, notes)
          VALUES (?, NULL, ?, ?, ?, ?)
        `);
        paymentRes = await insertWaterPay.run(customer.id, Number(water_entry_id), payAmount, mode, notes || '');
      } else {
        const insert = tx.prepare(`
          INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, notes)
          VALUES (?, ?, NULL, ?, ?, ?)
        `);
        paymentRes = await insert.run(customer.id, order_id ? Number(order_id) : null, payAmount, mode, notes || '');
      }

      // 1. If specific order_id specified, update order paid_amount
      if (order_id) {
        const order = await tx.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
        if (order) {
          const orderTotal = parseFloat(order.total_amount) || 0;
          const currentPaid = parseFloat(order.paid_amount) || 0;
          const newPaid = Math.min(orderTotal, currentPaid + payAmount);
          const newStatus = newPaid >= orderTotal ? 'Paid' : 'Partial';
          await tx.prepare('UPDATE orders SET payment_status = ?, paid_amount = ? WHERE id = ?')
            .run(newStatus, newPaid, order.id);
        }
      } else if (water_entry_id) {
        // 2. If specific water_entry_id specified, update water_entry paid_amount & status
        const w = await tx.prepare('SELECT * FROM water_entries WHERE id = ?').get(water_entry_id);
        if (w) {
          const wTotal = parseFloat(w.total_amount) || 0;
          const currentPaid = w.payment_status === 'Paid' ? wTotal : (parseFloat(w.paid_amount) || 0);
          const newPaid = Math.min(wTotal, currentPaid + payAmount);
          const newStatus = newPaid >= wTotal ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Pending');
          await tx.prepare('UPDATE water_entries SET payment_status = ?, paid_amount = ? WHERE id = ?')
            .run(newStatus, newPaid, w.id);
        }
      } else {
        // 3. Auto settle oldest pending/partial orders first, then pending/partial water entries (FIFO)
        let remaining = payAmount;
        const unpaidOrders = await tx.prepare(`
          SELECT id, total_amount, paid_amount 
          FROM orders 
          WHERE customer_id = ? AND payment_status != 'Paid' AND delivery_status != 'Cancelled'
          ORDER BY order_date ASC
        `).all(customer.id);

        for (const o of unpaidOrders || []) {
          if (remaining <= 0) break;
          const total = parseFloat(o.total_amount) || 0;
          const currentPaid = parseFloat(o.paid_amount) || 0;
          const due = Math.max(0, total - currentPaid);
          if (due <= 0) continue;
          const paying = Math.min(due, remaining);
          const updatedPaid = currentPaid + paying;
          const newStatus = updatedPaid >= total ? 'Paid' : 'Partial';

          await tx.prepare('UPDATE orders SET payment_status = ?, paid_amount = ? WHERE id = ?')
            .run(newStatus, updatedPaid, o.id);

          remaining -= paying;
        }

        // If still remaining, settle oldest pending/partial water entries (supports partial payments)
        if (remaining > 0) {
          const unpaidWater = await tx.prepare(`
            SELECT id, total_amount, paid_amount, payment_status
            FROM water_entries 
            WHERE customer_id = ? AND payment_status != 'Paid'
            ORDER BY date ASC
          `).all(customer.id);

          for (const w of unpaidWater || []) {
            if (remaining <= 0) break;
            const wTotal = parseFloat(w.total_amount) || 0;
            const currentPaid = w.payment_status === 'Paid' ? wTotal : (parseFloat(w.paid_amount) || 0);
            const due = Math.max(0, wTotal - currentPaid);
            if (due <= 0) continue;
            const paying = Math.min(due, remaining);
            const updatedPaid = currentPaid + paying;
            const newStatus = updatedPaid >= wTotal ? 'Paid' : 'Partial';

            await tx.prepare('UPDATE water_entries SET payment_status = ?, paid_amount = ? WHERE id = ?')
              .run(newStatus, updatedPaid, w.id);

            remaining -= paying;
          }
        }
      }

      return paymentRes;
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      paymentId: result.lastInsertRowid,
      payment: {
        id: result.lastInsertRowid,
        customer_id: customer.id,
        amount: payAmount,
        payment_mode: mode
      },
      amount: payAmount,
      mode
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ error: 'Error recording payment' });
  }
});

module.exports = router;
