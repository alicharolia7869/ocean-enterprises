const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/payments - Payment history & pending ledgers
router.get('/', authMiddleware, (req, res) => {
  try {
    const store = db._getStore();
    const { mode, status, customerId } = req.query;

    let list = [...store.payments];

    if (customerId) {
      list = list.filter(p => p.customer_id === Number(customerId));
    }

    if (mode && mode !== 'All') {
      list = list.filter(p => p.payment_mode === mode);
    }

    // Enrich with Customer & Order
    const enriched = list.map(p => {
      const c = store.customers.find(cust => cust.id === p.customer_id) || {};
      const o = p.order_id ? store.orders.find(ord => ord.id === p.order_id) : null;
      return {
        ...p,
        customer_name: c.name || '',
        business_name: c.business_name || '',
        customer_phone: c.phone || '',
        order_number: o ? o.order_number : null
      };
    });

    enriched.sort((a, b) => (b.payment_date || b.created_at || '').localeCompare(a.payment_date || a.created_at || ''));

    // Outstanding balances list for reminder sending
    const pendingCustomers = store.customers.map(c => {
      const orderPending = store.orders
        .filter(o => o.customer_id === c.id && o.payment_status !== 'Paid')
        .reduce((acc, o) => acc + Math.max(0, (o.total_amount || 0) - (o.paid_amount || 0)), 0);
      const waterPending = store.water_entries
        .filter(w => w.customer_id === c.id && w.payment_status === 'Pending')
        .reduce((acc, w) => acc + (w.total_amount || 0), 0);
      const totalPending = orderPending + waterPending;

      return {
        customer_id: c.id,
        customer_name: c.name,
        business_name: c.business_name,
        phone: c.phone,
        whatsapp_number: c.whatsapp_number || c.phone,
        totalPending: Math.round(totalPending),
        hasPending: totalPending > 0
      };
    }).filter(c => c.hasPending).sort((a, b) => b.totalPending - a.totalPending);

    res.json({
      payments: enriched,
      pendingCustomers
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Error fetching payments' });
  }
});

// POST /api/payments - Record standalone payment
router.post('/', authMiddleware, (req, res) => {
  try {
    const { customer_id, order_id, amount, payment_mode, notes } = req.body;
    if (!customer_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Customer and valid payment amount are required' });
    }

    const store = db._getStore();
    const customer = store.customers.find(c => c.id === Number(customer_id));
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const payAmount = parseFloat(amount);
    const mode = payment_mode || 'Cash';

    // Insert payment
    const insert = db.prepare(`
      INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, notes)
      VALUES (?, ?, NULL, ?, ?, ?)
    `);
    const result = insert.run(customer.id, order_id ? Number(order_id) : null, payAmount, mode, notes || '');

    // If order_id specified, update order paid_amount
    if (order_id) {
      const order = store.orders.find(o => o.id === Number(order_id));
      if (order) {
        const newPaid = Math.min(order.total_amount, (order.paid_amount || 0) + payAmount);
        const newStatus = newPaid >= order.total_amount ? 'Paid' : 'Partial';
        db.prepare('UPDATE orders SET payment_status = ?, paid_amount = ? WHERE id = ?')
          .run(newStatus, newPaid, order.id);
      }
    } else {
      // Auto settle oldest pending orders / water entries
      let remaining = payAmount;
      const unpaidOrders = store.orders
        .filter(o => o.customer_id === customer.id && o.payment_status !== 'Paid')
        .sort((a, b) => (a.order_date || '').localeCompare(b.order_date || ''));

      for (const o of unpaidOrders) {
        if (remaining <= 0) break;
        const due = o.total_amount - (o.paid_amount || 0);
        const paying = Math.min(due, remaining);
        const updatedPaid = (o.paid_amount || 0) + paying;
        o.paid_amount = updatedPaid;
        o.payment_status = updatedPaid >= o.total_amount ? 'Paid' : 'Partial';
        remaining -= paying;
      }

      if (remaining > 0) {
        const unpaidWater = store.water_entries
          .filter(w => w.customer_id === customer.id && w.payment_status === 'Pending')
          .sort((a, b) => a.date.localeCompare(b.date));

        for (const w of unpaidWater) {
          if (remaining <= 0) break;
          if (remaining >= w.total_amount) {
            w.payment_status = 'Paid';
            remaining -= w.total_amount;
          }
        }
      }
      db._save();
    }

    res.status(201).json({
      message: 'Payment recorded successfully',
      paymentId: result.lastInsertRowid,
      amount: payAmount,
      mode
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ error: 'Error recording payment' });
  }
});

module.exports = router;
