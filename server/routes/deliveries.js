const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/deliveries - Today's deliveries & route stops
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT d.*, 
             c.name as customer_name, c.business_name, c.phone as customer_phone, 
             c.whatsapp_number as customer_whatsapp,
             o.order_number, o.total_amount, o.paid_amount, o.payment_status, o.order_date, o.special_instructions
      FROM deliveries d
      JOIN customers c ON d.customer_id = c.id
      JOIN orders o ON d.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ` AND d.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY d.route_sequence ASC, d.created_at ASC`;

    const deliveries = await db.prepare(query).all(...params);

    const enriched = [];
    for (const d of deliveries || []) {
      const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(d.order_id);
      enriched.push({
        ...d,
        total_amount: parseFloat(d.total_amount) || 0,
        paid_amount: parseFloat(d.paid_amount) || 0,
        latitude: d.latitude ? parseFloat(d.latitude) : null,
        longitude: d.longitude ? parseFloat(d.longitude) : null,
        has_coordinates: Boolean(d.latitude && d.longitude),
        order_items: (items || []).map(it => ({
          ...it,
          price: parseFloat(it.price) || 0,
          subtotal: parseFloat(it.subtotal) || 0
        }))
      });
    }

    res.json({ deliveries: enriched });
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    res.status(500).json({ error: 'Error fetching deliveries' });
  }
});

// PUT /api/deliveries/reorder - Optimize or update route sequence order
router.put('/reorder', authMiddleware, async (req, res) => {
  try {
    const { sequences } = req.body; // array of { id, route_sequence }
    if (!Array.isArray(sequences)) {
      return res.status(400).json({ error: 'Sequences array required' });
    }

    for (const item of sequences) {
      if (item && item.id) {
        await db.prepare('UPDATE deliveries SET route_sequence = ? WHERE id = ?')
          .run(parseInt(item.route_sequence, 10) || 0, item.id);
      }
    }

    res.json({ message: 'Delivery route updated successfully' });
  } catch (err) {
    console.error('Error reordering deliveries:', err);
    res.status(500).json({ error: 'Error reordering deliveries' });
  }
});

// PUT /api/deliveries/:id/status - Update single delivery status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, driver_notes } = req.body;
    const deliv = await db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!deliv) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (status === 'Delivered') {
      await db.prepare("UPDATE deliveries SET status = ?, driver_notes = COALESCE(?, driver_notes), delivered_at = datetime('now') WHERE id = ?")
        .run(status, driver_notes || null, req.params.id);
    } else {
      await db.prepare('UPDATE deliveries SET status = ?, driver_notes = COALESCE(?, driver_notes) WHERE id = ?')
        .run(status, driver_notes || null, req.params.id);
    }

    // Sync status to associated order
    await db.prepare('UPDATE orders SET delivery_status = ? WHERE id = ?')
      .run(status, deliv.order_id);

    const updated = await db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    res.json({ message: `Delivery updated to ${status}`, delivery: updated });
  } catch (err) {
    console.error('Error updating delivery status:', err);
    res.status(500).json({ error: 'Error updating delivery status' });
  }
});

module.exports = router;
