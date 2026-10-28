const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/products
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, lowStockOnly, activeOnly } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
    }
    if (category && category !== 'All') {
      params.push(category);
    }

    if (activeOnly === 'true' || activeOnly === undefined) {
      query += ' AND active = 1';
    }

    if (lowStockOnly === 'true') {
      query += ' AND stock <= minimum_stock';
    }

    query += ' ORDER BY category ASC, name ASC';

    const products = await db.prepare(query).all(...params);

    // Add units_sold aggregate
    const enriched = [];
    for (const p of products || []) {
      const soldStats = await db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as total_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ? AND o.delivery_status != 'Cancelled'
      `).get(p.id);

      let waterSold = 0;
      if (p.category === 'Water') {
        const waterStats = await db.prepare(`
          SELECT COALESCE(SUM(quantity), 0) as total_water_sold
          FROM water_entries
          WHERE product_id = ?
        `).get(p.id);
        waterSold = parseInt(waterStats?.total_water_sold || 0, 10);
      }

      const totalSold = parseInt(soldStats?.total_sold || 0, 10) + waterSold;
      const stock = parseInt(p.stock, 10) || 0;
      const minStock = parseInt(p.minimum_stock, 10) || 10;

      enriched.push({
        ...p,
        selling_price: parseFloat(p.selling_price) || 0,
        purchase_price: parseFloat(p.purchase_price) || 0,
        stock,
        minimum_stock: minStock,
        units_sold: totalSold,
        is_low_stock: stock <= minStock
      });
    }

    res.json({ products: enriched });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// POST /api/products - Create new product
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, category, size, selling_price, purchase_price, stock, minimum_stock } = req.body;
    if (!name || !category || selling_price === undefined) {
      return res.status(400).json({ error: 'Name, Category, and Selling Price are required' });
    }

    const insert = db.prepare(`
      INSERT INTO products (name, category, size, selling_price, purchase_price, stock, minimum_stock, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = await insert.run(
      name.trim(),
      category,
      size || 'Standard',
      parseFloat(selling_price),
      purchase_price ? parseFloat(purchase_price) : 0,
      stock ? parseInt(stock, 10) : 0,
      minimum_stock ? parseInt(minimum_stock, 10) : 10
    );

    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Product created successfully',
      product: {
        ...product,
        selling_price: parseFloat(product.selling_price) || 0,
        purchase_price: parseFloat(product.purchase_price) || 0
      }
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Error creating product' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { name, category, size, selling_price, purchase_price, stock, minimum_stock, active } = req.body;
    const update = db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, size = ?, selling_price = ?, purchase_price = ?, 
          stock = ?, minimum_stock = ?, active = ?
      WHERE id = ?
    `);

    await update.run(
      name !== undefined ? name : existing.name,
      category !== undefined ? category : existing.category,
      size !== undefined ? size : existing.size,
      selling_price !== undefined ? parseFloat(selling_price) : parseFloat(existing.selling_price),
      purchase_price !== undefined ? parseFloat(purchase_price) : parseFloat(existing.purchase_price),
      stock !== undefined ? parseInt(stock, 10) : parseInt(existing.stock, 10),
      minimum_stock !== undefined ? parseInt(minimum_stock, 10) : parseInt(existing.minimum_stock, 10),
      active === undefined ? existing.active : (active ? 1 : 0),
      req.params.id
    );

    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({
      message: 'Product updated successfully',
      product: {
        ...updated,
        selling_price: parseFloat(updated.selling_price) || 0,
        purchase_price: parseFloat(updated.purchase_price) || 0
      }
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Error updating product' });
  }
});

// POST /api/products/:id/stock & /api/products/:id/adjust-stock
const handleStockAdjust = async (req, res) => {
  try {
    const { adjustmentType, type, quantity } = req.body;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      return res.status(400).json({ error: 'Valid quantity number required' });
    }

    const action = (adjustmentType || type || '').toUpperCase();
    if (action === 'ADD') {
      await db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, req.params.id);
    } else if (action === 'REMOVE') {
      await db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(qty, req.params.id);
    } else {
      await db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(Math.max(0, qty), req.params.id);
    }

    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ message: 'Stock updated successfully', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error updating stock' });
  }
};

router.post('/:id/stock', authMiddleware, handleStockAdjust);
router.post('/:id/adjust-stock', authMiddleware, handleStockAdjust);

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error removing product' });
  }
});

module.exports = router;
