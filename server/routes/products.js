const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/products
router.get('/', authMiddleware, (req, res) => {
  try {
    const { category, lowStockOnly, activeOnly } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (activeOnly === 'true' || activeOnly === undefined) {
      query += ' AND active = 1';
    }

    if (lowStockOnly === 'true') {
      query += ' AND stock <= minimum_stock';
    }

    query += ' ORDER BY category ASC, name ASC';

    const products = db.prepare(query).all(...params);

    // Add units_sold aggregate
    const enriched = products.map(p => {
      const soldStats = db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as total_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ? AND o.delivery_status != 'Cancelled'
      `).get(p.id);

      const waterSoldStats = p.category === 'Water' ? (db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as total_water_sold
        FROM water_entries
        WHERE product_id = ?
      `).get(p.id)?.total_water_sold || 0) : 0;

      const totalSold = (soldStats?.total_sold || 0) + waterSoldStats;

      return {
        ...p,
        units_sold: totalSold,
        is_low_stock: p.stock <= p.minimum_stock
      };
    });

    res.json({ products: enriched });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// POST /api/products - Create new product
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, category, size, selling_price, purchase_price, stock, minimum_stock } = req.body;
    if (!name || !category || selling_price === undefined) {
      return res.status(400).json({ error: 'Name, Category, and Selling Price are required' });
    }

    const insert = db.prepare(`
      INSERT INTO products (name, category, size, selling_price, purchase_price, stock, minimum_stock, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = insert.run(
      name.trim(),
      category,
      size || 'Standard',
      parseFloat(selling_price),
      purchase_price ? parseFloat(purchase_price) : 0,
      stock ? parseInt(stock, 10) : 0,
      minimum_stock ? parseInt(minimum_stock, 10) : 10
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Error creating product' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { name, category, size, selling_price, purchase_price, stock, minimum_stock, active } = req.body;
    const update = db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, size = ?, selling_price = ?, purchase_price = ?, 
          stock = ?, minimum_stock = ?, active = ?
      WHERE id = ?
    `);

    update.run(
      name,
      category,
      size,
      parseFloat(selling_price),
      parseFloat(purchase_price),
      parseInt(stock, 10),
      parseInt(minimum_stock, 10),
      active === undefined ? 1 : (active ? 1 : 0),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ message: 'Product updated successfully', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error updating product' });
  }
});

// POST /api/products/:id/stock - Adjust stock (add units purchased or manual correction)
router.post('/:id/stock', authMiddleware, (req, res) => {
  try {
    const { adjustmentType, quantity, notes } = req.body;
    // adjustmentType: 'ADD' (new inventory received) or 'SET' (recount)
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      return res.status(400).json({ error: 'Valid quantity number required' });
    }

    if (adjustmentType === 'ADD') {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, req.params.id);
    } else {
      db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(qty, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ message: 'Stock updated successfully', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error updating stock' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    // Soft delete or check references
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error removing product' });
  }
});

module.exports = router;
