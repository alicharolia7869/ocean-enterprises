const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders - List orders with filters & search
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { filter, period, customerId, deliveryStatus, paymentStatus, search, startDate, endDate } = req.query;
    const timeFilter = filter || period;

    let query = `
      SELECT o.*, 
             c.name as customer_name, c.business_name, c.phone as customer_phone, 
             c.whatsapp_number as customer_whatsapp, c.address as customer_address,
             d.status as delivery_status_info, d.route_sequence, d.driver_notes
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN deliveries d ON d.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      query += ` AND o.customer_id = ?`;
      params.push(parseInt(customerId, 10));
    }

    if (deliveryStatus && deliveryStatus !== 'All') {
      query += ` AND o.delivery_status = ?`;
      params.push(deliveryStatus);
    }

    if (paymentStatus && paymentStatus !== 'All') {
      query += ` AND o.payment_status = ?`;
      params.push(paymentStatus);
    }

    const now = new Date();

    if (timeFilter === 'Today') {
      query += ` AND date(o.order_date) = date('now')`;
    } else if (timeFilter === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      query += ` AND date(o.order_date) = ?`;
      params.push(yStr);
    } else if (timeFilter === 'This Week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const wStr = weekAgo.toISOString().slice(0, 10);
      query += ` AND date(o.order_date) >= ?`;
      params.push(wStr);
    } else if (timeFilter === 'This Month') {
      query += ` AND strftime('%Y-%m', o.order_date) = strftime('%Y-%m', 'now')`;
    } else if (startDate && endDate) {
      query += ` AND date(o.order_date) >= ? AND date(o.order_date) <= ?`;
      params.push(startDate, endDate);
    }

    if (search) {
      const q = `%${search.trim()}%`;
      query += ` AND (o.order_number LIKE ? OR c.name LIKE ? OR c.business_name LIKE ? OR c.phone LIKE ? OR o.delivery_address LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    query += ` ORDER BY o.order_date DESC`;

    const orders = await db.prepare(query).all(...params);

    // Fetch order items for each order
    const enriched = [];
    for (const o of orders || []) {
      const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
      enriched.push({
        ...o,
        total_amount: parseFloat(o.total_amount) || 0,
        paid_amount: parseFloat(o.paid_amount) || 0,
        items: (items || []).map(it => ({
          ...it,
          price: parseFloat(it.price) || 0,
          subtotal: parseFloat(it.subtotal) || 0
        })),
        delivery_info: {
          status: o.delivery_status_info || o.delivery_status,
          route_sequence: o.route_sequence || 0,
          driver_notes: o.driver_notes || ''
        }
      });
    }

    res.json({ orders: enriched });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// GET /api/orders/:id - Single order details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await db.prepare(`
      SELECT o.*, c.name as customer_name, c.business_name, c.phone as customer_phone, 
             c.whatsapp_number as customer_whatsapp, c.address as customer_address
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const delivery = await db.prepare('SELECT * FROM deliveries WHERE order_id = ?').get(order.id);

    res.json({
      order: {
        ...order,
        total_amount: parseFloat(order.total_amount) || 0,
        paid_amount: parseFloat(order.paid_amount) || 0,
        items: (items || []).map(it => ({
          ...it,
          price: parseFloat(it.price) || 0,
          subtotal: parseFloat(it.subtotal) || 0
        })),
        delivery_info: delivery || null
      }
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: 'Error fetching order details' });
  }
});

// POST /api/orders - Create structured order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { customer_id, items, special_instructions, notes, delivery_address, latitude, longitude, source, paid_amount, payment_mode } = req.body;
    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one item are required' });
    }

    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate total amount & prepare items
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      const qty = parseInt(item.quantity, 10);
      const rawPrice = item.price !== undefined ? item.price : item.unit_price;
      const price = rawPrice !== undefined ? parseFloat(rawPrice) : (product ? parseFloat(product.selling_price) : 0);
      const subtotal = Math.round(qty * price);

      totalAmount += subtotal;
      validatedItems.push({
        product_id: product ? product.id : item.product_id,
        product_name: product ? product.name : (item.product_name || 'Product'),
        quantity: qty,
        price,
        subtotal
      });

      // Auto reduce product stock
      if (product) {
        await db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(qty, product.id);
      }
    }

    const initialPaid = paid_amount ? parseFloat(paid_amount) : 0;
    let paymentStatus = 'Pending';
    if (initialPaid >= totalAmount && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else if (initialPaid > 0) {
      paymentStatus = 'Partial';
    }

    const maxIdRes = await db.prepare('SELECT COALESCE(MAX(id), 0) as max_id FROM orders').get();
    const nextOrderNum = `ORD-${new Date().getFullYear()}-${String((parseInt(maxIdRes?.max_id, 10) || 0) + 1).padStart(4, '0')}`;
    const targetAddress = delivery_address || customer.address;
    const targetLat = latitude ? parseFloat(latitude) : (customer.latitude ? parseFloat(customer.latitude) : null);
    const targetLng = longitude ? parseFloat(longitude) : (customer.longitude ? parseFloat(customer.longitude) : null);
    const instructions = special_instructions || notes || '';

    // Insert Order
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, customer_id, total_amount, paid_amount, payment_status, delivery_status, delivery_address, latitude, longitude, special_instructions, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderRes = await insertOrder.run(
      nextOrderNum,
      customer.id,
      totalAmount,
      initialPaid,
      paymentStatus,
      'New Order',
      targetAddress,
      targetLat,
      targetLng,
      instructions,
      source || 'Manual'
    );

    const orderId = orderRes.lastInsertRowid;

    // Insert Order Items
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const it of validatedItems) {
      await insertItem.run(orderId, it.product_id, it.product_name, it.quantity, it.price, it.subtotal);
    }

    // Auto Create Delivery Entry
    const nextSeqRes = await db.prepare('SELECT COUNT(*) as count FROM deliveries').get();
    const nextSeq = (parseInt(nextSeqRes?.count, 10) || 0) + 1;

    const insertDeliv = db.prepare(`
      INSERT INTO deliveries (order_id, customer_id, delivery_address, latitude, longitude, status, route_sequence, driver_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await insertDeliv.run(orderId, customer.id, targetAddress, targetLat, targetLng, 'New Order', nextSeq, instructions);

    // If initial payment recorded
    if (initialPaid > 0) {
      await db.prepare(`
        INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, payment_date, status, notes)
        VALUES (?, ?, NULL, ?, ?, datetime('now'), 'Completed', ?)
      `).run(customer.id, orderId, initialPaid, payment_mode || 'Cash', `Initial payment for Order #${nextOrderNum}`);
    }

    const createdOrder = await db.prepare(`
      SELECT o.*, c.name as customer_name, c.business_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(orderId);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...createdOrder,
        total_amount: totalAmount,
        paid_amount: initialPaid,
        items: validatedItems
      }
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Error creating order' });
  }
});

// PUT /api/orders/:id/status - Update delivery status workflow
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['New Order', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const wasCancelled = order.delivery_status === 'Cancelled';
    const isCancelled = status === 'Cancelled';
    if (!wasCancelled && isCancelled) {
      const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      for (const it of items || []) {
        await db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.quantity, it.product_id);
      }
    } else if (wasCancelled && !isCancelled) {
      const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      for (const it of items || []) {
        await db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(it.quantity, it.product_id);
      }
    }

    await db.prepare('UPDATE orders SET delivery_status = ? WHERE id = ?').run(status, req.params.id);

    // If marked Delivered, auto update delivery record
    if (status === 'Delivered') {
      await db.prepare("UPDATE deliveries SET status = ?, delivered_at = datetime('now') WHERE order_id = ?").run(status, req.params.id);
    } else {
      await db.prepare('UPDATE deliveries SET status = ? WHERE order_id = ?').run(status, req.params.id);
    }

    res.json({ message: `Order status updated to ${status}`, status });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Error updating order status' });
  }
});

// PUT /api/orders/:id/payment - Mark paid or record payment
router.put('/:id/payment', authMiddleware, async (req, res) => {
  try {
    const { amount, payment_mode, markAsFull } = req.body;
    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentPaid = parseFloat(order.paid_amount) || 0;
    const total = parseFloat(order.total_amount) || 0;

    let newPaid = currentPaid;
    let paymentAmount = 0;

    if (markAsFull) {
      paymentAmount = Math.max(0, total - currentPaid);
      newPaid = total;
    } else {
      paymentAmount = parseFloat(amount || 0);
      newPaid = Math.min(total, currentPaid + paymentAmount);
    }

    const newStatus = newPaid >= total ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Pending');

    await db.prepare('UPDATE orders SET payment_status = ?, paid_amount = ? WHERE id = ?')
      .run(newStatus, newPaid, order.id);

    // Record in payments table
    if (paymentAmount > 0) {
      await db.prepare(`
        INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, notes)
        VALUES (?, ?, NULL, ?, ?, ?)
      `).run(order.customer_id, order.id, paymentAmount, payment_mode || 'Cash', `Payment for ${order.order_number}`);
    }

    res.json({
      message: `Payment updated. Status: ${newStatus}`,
      paid_amount: newPaid,
      payment_status: newStatus,
      balance_remaining: Math.max(0, total - newPaid)
    });
  } catch (err) {
    console.error('Error updating order payment:', err);
    res.status(500).json({ error: 'Error updating payment' });
  }
});

// POST /api/orders/parse-whatsapp - AI/NLP WhatsApp text parser
router.post('/parse-whatsapp', authMiddleware, async (req, res) => {
  try {
    const rawText = req.body.messageText || req.body.message;
    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const cleanText = rawText.trim();
    const lower = cleanText.toLowerCase();

    // 1. Identify Customer if mentioned in message
    const allCustomers = await db.prepare('SELECT id, name, business_name, phone, address, latitude, longitude FROM customers').all();
    let matchedCustomer = null;
    for (const c of allCustomers || []) {
      const nameMatch = c.name && lower.includes(c.name.toLowerCase());
      const bizMatch = c.business_name && lower.includes(c.business_name.toLowerCase());
      const phoneMatch = c.phone && lower.includes(c.phone.replace(/[^0-9]/g, ''));
      if (bizMatch || nameMatch || phoneMatch) {
        matchedCustomer = c;
        break;
      }
    }

    // 2. Parse Items & Quantities
    const parsedItems = [];
    const products = await db.prepare('SELECT * FROM products WHERE active = 1').all();

    // Keyword dictionary mapping
    const keywords = [
      { key: '20l', productMatch: p => p.category === 'Water' && p.name.includes('20L') },
      { key: 'water', productMatch: p => p.category === 'Water' && p.name.includes('20L') },
      { key: 'jar', productMatch: p => p.category === 'Water' && p.name.includes('20L') },
      { key: '1l', productMatch: p => p.category === 'Water' && p.name.includes('1L') },
      { key: '500ml water', productMatch: p => p.category === 'Water' && p.name.includes('500ml') },
      { key: 'frooti 1.2', productMatch: p => p.name.includes('Frooti 1.2') },
      { key: 'frooti 600', productMatch: p => p.name.includes('Frooti 600') },
      { key: 'frooti 300', productMatch: p => p.name.includes('Frooti 300') },
      { key: 'frooti 160', productMatch: p => p.name.includes('Frooti 160') },
      { key: 'frooti', productMatch: p => p.name.includes('Frooti 600') },
      { key: 'appy fizz', productMatch: p => p.name.includes('Appy Fizz 600') },
      { key: 'appy', productMatch: p => p.name.includes('Appy Fizz') },
      { key: 'thums up', productMatch: p => p.name.includes('Thums Up 750') },
      { key: 'thumsup', productMatch: p => p.name.includes('Thums Up') },
      { key: 'litchi', productMatch: p => p.name.includes('Litchi') },
      { key: 'guava', productMatch: p => p.name.includes('Guava') }
    ];

    const segments = cleanText.split(/[\n,;+]/).map(s => s.trim()).filter(Boolean);

    for (const segment of segments) {
      const segLower = segment.toLowerCase();
      const numMatch = segLower.match(/(\d+)\s*(?:x|units?|bottles?|jars?|nos?|cans?|packs?|boxes?)?/i) || segLower.match(/(?:qty|quantity)?:?\s*(\d+)/i);
      const qty = numMatch ? parseInt(numMatch[1], 10) : 1;

      let matchedProduct = null;
      for (const kw of keywords) {
        if (segLower.includes(kw.key)) {
          matchedProduct = (products || []).find(kw.productMatch);
          if (matchedProduct) break;
        }
      }

      if (matchedProduct) {
        const existing = parsedItems.find(it => it.product_id === matchedProduct.id);
        const itemPrice = parseFloat(matchedProduct.selling_price) || 0;
        if (existing) {
          existing.quantity += qty;
          existing.subtotal = existing.quantity * existing.price;
        } else {
          parsedItems.push({
            product_id: matchedProduct.id,
            product_name: matchedProduct.name,
            size: matchedProduct.size,
            price: itemPrice,
            quantity: qty,
            subtotal: qty * itemPrice
          });
        }
      }
    }

    if (parsedItems.length === 0) {
      for (const kw of keywords) {
        const regex = new RegExp(`(\\d+)\\s*(?:x|units?|bottles?|jars?|nos?)?\\s*(?:of)?\\s*${kw.key}`, 'i');
        const match = lower.match(regex);
        if (match) {
          const qty = parseInt(match[1], 10) || 1;
          const matchedProduct = (products || []).find(kw.productMatch);
          if (matchedProduct && !parsedItems.some(it => it.product_id === matchedProduct.id)) {
            const itemPrice = parseFloat(matchedProduct.selling_price) || 0;
            parsedItems.push({
              product_id: matchedProduct.id,
              product_name: matchedProduct.name,
              size: matchedProduct.size,
              price: itemPrice,
              quantity: qty,
              subtotal: qty * itemPrice
            });
          }
        }
      }
    }

    const calculatedTotal = parsedItems.reduce((acc, it) => acc + it.subtotal, 0);

    res.json({
      rawText: cleanText,
      matchedCustomer: matchedCustomer ? {
        id: matchedCustomer.id,
        name: matchedCustomer.name,
        business_name: matchedCustomer.business_name,
        phone: matchedCustomer.phone,
        address: matchedCustomer.address,
        latitude: matchedCustomer.latitude,
        longitude: matchedCustomer.longitude
      } : null,
      parsedItems,
      items: parsedItems,
      totalAmount: calculatedTotal,
      confidence: parsedItems.length > 0 ? (matchedCustomer ? 'HIGH' : 'MEDIUM') : 'LOW'
    });
  } catch (err) {
    console.error('Error parsing WhatsApp message:', err);
    res.status(500).json({ error: 'Failed to parse WhatsApp message' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Revert inventory only if order was not already cancelled
    if (order.delivery_status !== 'Cancelled') {
      const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
      for (const it of items || []) {
        await db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.quantity, it.product_id);
      }
    }

    // Delete cascading
    await db.prepare('DELETE FROM deliveries WHERE order_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM payments WHERE order_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);

    res.json({ message: 'Order deleted and inventory reverted' });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Error deleting order' });
  }
});

module.exports = router;
