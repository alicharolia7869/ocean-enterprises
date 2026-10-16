const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/deliveries - Today's deliveries & route stops
router.get('/', authMiddleware, (req, res) => {
  try {
    const store = db._getStore();
    const { status, date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    let list = [...store.deliveries];

    // Enrich deliveries with Customer and Order
    const enriched = list.map(d => {
      const c = store.customers.find(cust => cust.id === d.customer_id) || {};
      const o = store.orders.find(ord => ord.id === d.order_id) || {};
      const items = store.order_items.filter(oi => oi.order_id === d.order_id);

      return {
        ...d,
        customer_name: c.name || '',
        business_name: c.business_name || '',
        customer_phone: c.phone || '',
        customer_whatsapp: c.whatsapp_number || c.phone || '',
        order_number: o.order_number || '',
        total_amount: o.total_amount || 0,
        paid_amount: o.paid_amount || 0,
        payment_status: o.payment_status || 'Pending',
        order_date: o.order_date || d.created_at,
        order_items: items,
        special_instructions: o.special_instructions || d.driver_notes || '',
        has_coordinates: !!(d.latitude && d.longitude)
      };
    });

    // Filter by status if provided
    let filtered = enriched;
    if (status && status !== 'All') {
      filtered = filtered.filter(d => d.status === status);
    }

    // Sort by route_sequence (Delivery 1 -> Delivery 2 -> Delivery 3...)
    filtered.sort((a, b) => (a.route_sequence || 0) - (b.route_sequence || 0));

    res.json({ deliveries: filtered });
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    res.status(500).json({ error: 'Error fetching deliveries' });
  }
});

// PUT /api/deliveries/reorder - Optimize or update route sequence order
router.put('/reorder', authMiddleware, (req, res) => {
  try {
    const { sequences } = req.body; // array of { id, route_sequence }
    if (!Array.isArray(sequences)) {
      return res.status(400).json({ error: 'Sequences array required' });
    }

    const store = db._getStore();
    for (const item of sequences) {
      const deliv = store.deliveries.find(d => d.id === Number(item.id));
      if (deliv) {
        deliv.route_sequence = Number(item.route_sequence);
      }
    }
    db._save();

    res.json({ message: 'Delivery route updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error reordering deliveries' });
  }
});

// PUT /api/deliveries/:id/status - Update single delivery status
router.put('/:id/status', authMiddleware, (req, res) => {
  try {
    const { status, driver_notes } = req.body;
    const store = db._getStore();
    const deliv = store.deliveries.find(d => d.id === Number(req.params.id));
    if (!deliv) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    deliv.status = status;
    if (driver_notes) deliv.driver_notes = driver_notes;
    if (status === 'Delivered') {
      deliv.delivered_at = new Date().toISOString();
    }

    // Sync status to associated order
    const ord = store.orders.find(o => o.id === deliv.order_id);
    if (ord) {
      ord.delivery_status = status;
    }

    db._save();

    res.json({ message: `Delivery updated to ${status}`, delivery: deliv });
  } catch (err) {
    res.status(500).json({ error: 'Error updating delivery status' });
  }
});

module.exports = router;
