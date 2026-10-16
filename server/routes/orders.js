const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders - List orders with filters & search
router.get('/', authMiddleware, (req, res) => {
  try {
    const { filter, customerId, deliveryStatus, paymentStatus, search, startDate, endDate } = req.query;
    const store = db._getStore();
    let orders = [...store.orders];

    // Filter by customer
    if (customerId) {
      orders = orders.filter(o => o.customer_id === Number(customerId));
    }

    // Filter by delivery status
    if (deliveryStatus && deliveryStatus !== 'All') {
      orders = orders.filter(o => o.delivery_status === deliveryStatus);
    }

    // Filter by payment status
    if (paymentStatus && paymentStatus !== 'All') {
      orders = orders.filter(o => o.payment_status === paymentStatus);
    }

    // Date filters (Today, Yesterday, This Week, This Month, Custom)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (filter === 'Today') {
      orders = orders.filter(o => (o.order_date || o.created_at || '').slice(0, 10) === todayStr);
    } else if (filter === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      orders = orders.filter(o => (o.order_date || o.created_at || '').slice(0, 10) === yesterdayStr);
    } else if (filter === 'This Week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startStr = startOfWeek.toISOString().slice(0, 10);
      orders = orders.filter(o => (o.order_date || o.created_at || '').slice(0, 10) >= startStr);
    } else if (filter === 'This Month') {
      const monthStr = now.toISOString().slice(0, 7);
      orders = orders.filter(o => (o.order_date || o.created_at || '').slice(0, 7) === monthStr);
    } else if (startDate && endDate) {
      orders = orders.filter(o => {
        const d = (o.order_date || o.created_at || '').slice(0, 10);
        return d >= startDate && d <= endDate;
      });
    }

    // Enrich with Customer & Order Items
    let enriched = orders.map(o => {
      const cust = store.customers.find(c => c.id === o.customer_id) || {};
      const items = store.order_items.filter(oi => oi.order_id === o.id);
      const deliv = store.deliveries.find(d => d.order_id === o.id) || {};
      return {
        ...o,
        customer_name: cust.name || '',
        business_name: cust.business_name || '',
        customer_phone: cust.phone || '',
        customer_whatsapp: cust.whatsapp_number || cust.phone || '',
        customer_address: cust.address || o.delivery_address || '',
        items,
        delivery_info: deliv
      };
    });

    // Global Search across customer name, phone, order ID, product, address
    if (search) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(o =>
        (o.order_number && o.order_number.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.business_name && o.business_name.toLowerCase().includes(q)) ||
        (o.customer_phone && o.customer_phone.includes(q)) ||
        (o.delivery_address && o.delivery_address.toLowerCase().includes(q)) ||
        o.items.some(it => it.product_name && it.product_name.toLowerCase().includes(q))
      );
    }

    // Sort by latest order_date
    enriched.sort((a, b) => (b.order_date || b.created_at || '').localeCompare(a.order_date || a.created_at || ''));

    res.json({ orders: enriched });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// GET /api/orders/:id - Single order details
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const store = db._getStore();
    const order = store.orders.find(o => o.id === Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const cust = store.customers.find(c => c.id === order.customer_id) || {};
    const items = store.order_items.filter(oi => oi.order_id === order.id);
    const deliv = store.deliveries.find(d => d.order_id === order.id) || {};
    const orderPayments = store.payments.filter(p => p.order_id === order.id);

    res.json({
      order: {
        ...order,
        customer_name: cust.name,
        business_name: cust.business_name,
        customer_phone: cust.phone,
        customer_whatsapp: cust.whatsapp_number,
        customer_address: cust.address,
        items,
        delivery: deliv,
        payments: orderPayments
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching order details' });
  }
});

// POST /api/orders - Create structured order
router.post('/', authMiddleware, (req, res) => {
  try {
    const { customer_id, items, special_instructions, delivery_address, latitude, longitude, source, paid_amount, payment_mode } = req.body;
    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one item are required' });
    }

    const store = db._getStore();
    const customer = store.customers.find(c => c.id === Number(customer_id));
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate total amount & prepare items
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = store.products.find(p => p.id === Number(item.product_id));
      const qty = parseInt(item.quantity, 10);
      const price = item.price !== undefined ? parseFloat(item.price) : (product ? product.selling_price : 0);
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
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(qty, product.id);
      }
    }

    const initialPaid = paid_amount ? parseFloat(paid_amount) : 0;
    let paymentStatus = 'Pending';
    if (initialPaid >= totalAmount && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else if (initialPaid > 0) {
      paymentStatus = 'Partial';
    }

    const orderNum = `ORD-${new Date().getFullYear()}-${String(store.orders.length + 1).padStart(4, '0')}`;
    const targetAddress = delivery_address || customer.address;
    const targetLat = latitude ? parseFloat(latitude) : customer.latitude;
    const targetLng = longitude ? parseFloat(longitude) : customer.longitude;

    // Insert Order
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, customer_id, total_amount, paid_amount, payment_status, delivery_status, delivery_address, latitude, longitude, special_instructions, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderRes = insertOrder.run(
      orderNum,
      customer.id,
      totalAmount,
      initialPaid,
      paymentStatus,
      'New Order',
      targetAddress,
      targetLat,
      targetLng,
      special_instructions || '',
      source || 'Manual'
    );

    const orderId = orderRes.lastInsertRowid;

    // Insert Order Items
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const it of validatedItems) {
      insertItem.run(orderId, it.product_id, it.product_name, it.quantity, it.price, it.subtotal);
    }

    // Auto Create Delivery Entry
    const insertDeliv = db.prepare(`
      INSERT INTO deliveries (order_id, customer_id, delivery_address, latitude, longitude, status, route_sequence, driver_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const nextSeq = store.deliveries.length + 1;
    insertDeliv.run(orderId, customer.id, targetAddress, targetLat, targetLng, 'New Order', nextSeq, special_instructions || '');

    // If initial payment recorded
    if (initialPaid > 0) {
      db.prepare(`
        INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, notes)
        VALUES (?, ?, NULL, ?, ?, ?)
      `).run(customer.id, orderId, initialPaid, payment_mode || 'Cash', `Payment on order creation #${orderNum}`);
    }

    const createdOrder = store.orders.find(o => o.id === orderId);
    const createdItems = store.order_items.filter(oi => oi.order_id === orderId);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...createdOrder,
        customer_name: customer.name,
        business_name: customer.business_name,
        items: createdItems
      }
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Error creating order' });
  }
});

// PUT /api/orders/:id/status - Update delivery status workflow
router.put('/:id/status', authMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['New Order', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    const store = db._getStore();
    const order = store.orders.find(o => o.id === Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.prepare('UPDATE orders SET delivery_status = ? WHERE id = ?').run(status, req.params.id);

    // If marked Delivered, auto update delivery record
    const deliv = store.deliveries.find(d => d.order_id === Number(req.params.id));
    if (deliv) {
      deliv.status = status;
      if (status === 'Delivered') {
        deliv.delivered_at = new Date().toISOString();
      }
      db._save();
    }

    res.json({ message: `Order status updated to ${status}`, status });
  } catch (err) {
    res.status(500).json({ error: 'Error updating order status' });
  }
});

// PUT /api/orders/:id/payment - Mark paid or record payment
router.put('/:id/payment', authMiddleware, (req, res) => {
  try {
    const { amount, payment_mode, markAsFull } = req.body;
    const store = db._getStore();
    const order = store.orders.find(o => o.id === Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentPaid = Number(order.paid_amount || 0);
    const total = Number(order.total_amount || 0);

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

    db.prepare('UPDATE orders SET payment_status = ?, paid_amount = ? WHERE id = ?')
      .run(newStatus, newPaid, order.id);

    // Record in payments table
    if (paymentAmount > 0) {
      db.prepare(`
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
    res.status(500).json({ error: 'Error updating payment' });
  }
});

// POST /api/orders/parse-whatsapp - AI/NLP WhatsApp text parser
// Example: "2 water bottles, 3 Thums Up, 2 Appy Fizz" or "ABC Restaurant 5 water jar 3 frooti 600ml"
router.post('/parse-whatsapp', authMiddleware, (req, res) => {
  try {
    const { messageText } = req.body;
    if (!messageText || typeof messageText !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const store = db._getStore();
    const cleanText = messageText.trim();
    const lower = cleanText.toLowerCase();

    // 1. Identify Customer if mentioned in message
    let matchedCustomer = null;
    for (const c of store.customers) {
      const nameMatch = c.name && lower.includes(c.name.toLowerCase());
      const bizMatch = c.business_name && lower.includes(c.business_name.toLowerCase());
      const phoneMatch = c.phone && lower.includes(c.phone.replace(/[^0-9]/g, ''));
      if (bizMatch || nameMatch || phoneMatch) {
        matchedCustomer = c;
        break;
      }
    }

    // 2. Parse Items & Quantities
    // Recognizes patterns like:
    // "2 water bottles"
    // "3 Thums Up"
    // "2 x 20L"
    // "5 jar water"
    // "3 Frooti 600 ml"
    // "2 Appy Fizz"
    const parsedItems = [];
    const products = store.products.filter(p => p.active === 1);

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

    // Split message into lines or comma segments
    const segments = cleanText.split(/[\n,;\+]/).map(s => s.trim()).filter(Boolean);

    for (const segment of segments) {
      const segLower = segment.toLowerCase();
      // Extract number
      const numMatch = segLower.match(/(\d+)\s*(?:x|units?|bottles?|jars?|nos?|cans?|packs?|boxes?)?/i) || segLower.match(/(?:qty|quantity)?:?\s*(\d+)/i);
      const qty = numMatch ? parseInt(numMatch[1], 10) : 1;

      // Find best matching product
      let matchedProduct = null;

      for (const kw of keywords) {
        if (segLower.includes(kw.key)) {
          matchedProduct = products.find(kw.productMatch);
          if (matchedProduct) break;
        }
      }

      if (matchedProduct) {
        // Prevent duplicate, add quantity if exists
        const existing = parsedItems.find(it => it.product_id === matchedProduct.id);
        if (existing) {
          existing.quantity += qty;
          existing.subtotal = existing.quantity * existing.price;
        } else {
          parsedItems.push({
            product_id: matchedProduct.id,
            product_name: matchedProduct.name,
            size: matchedProduct.size,
            price: matchedProduct.selling_price,
            quantity: qty,
            subtotal: qty * matchedProduct.selling_price
          });
        }
      }
    }

    // Fallback if split didn't catch, try regex scanning across whole text
    if (parsedItems.length === 0) {
      for (const kw of keywords) {
        const regex = new RegExp(`(\\d+)\\s*(?:x|units?|bottles?|jars?|nos?)?\\s*(?:of)?\\s*${kw.key}`, 'i');
        const match = lower.match(regex);
        if (match) {
          const qty = parseInt(match[1], 10) || 1;
          const matchedProduct = products.find(kw.productMatch);
          if (matchedProduct && !parsedItems.some(it => it.product_id === matchedProduct.id)) {
            parsedItems.push({
              product_id: matchedProduct.id,
              product_name: matchedProduct.name,
              size: matchedProduct.size,
              price: matchedProduct.selling_price,
              quantity: qty,
              subtotal: qty * matchedProduct.selling_price
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
      totalAmount: calculatedTotal,
      confidence: parsedItems.length > 0 ? (matchedCustomer ? 'HIGH' : 'MEDIUM') : 'LOW'
    });
  } catch (err) {
    console.error('Error parsing WhatsApp message:', err);
    res.status(500).json({ error: 'Failed to parse WhatsApp message' });
  }
});

module.exports = router;
