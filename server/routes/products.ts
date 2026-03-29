import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name, COALESCE(sl.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      ORDER BY p.name
    `).all();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, COALESCE(sl.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/', (req, res) => {
  try {
    const { sku, name, description, category_id, cost_price, sale_price, unit, tax_rate, min_stock } = req.body;
    if (!sku || !name || sale_price === undefined) {
      return res.status(400).json({ error: 'SKU, name, and sale price are required' });
    }

    const result = db.prepare(`
      INSERT INTO products (sku, name, description, category_id, cost_price, sale_price, unit, tax_rate, min_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sku, name, description || null, category_id || null, cost_price || 0, sale_price, unit || 'pcs', tax_rate || 0, min_stock || 0);

    // Create stock level entry
    db.prepare('INSERT INTO stock_levels (product_id, quantity) VALUES (?, 0)').run(result.lastInsertRowid);

    const product = db.prepare(`
      SELECT p.*, c.name as category_name, COALESCE(sl.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(product);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { sku, name, description, category_id, cost_price, sale_price, unit, tax_rate, min_stock } = req.body;
    if (!sku || !name || sale_price === undefined) {
      return res.status(400).json({ error: 'SKU, name, and sale price are required' });
    }

    const result = db.prepare(`
      UPDATE products SET sku=?, name=?, description=?, category_id=?, cost_price=?, sale_price=?, unit=?, tax_rate=?, min_stock=?, updated_at=datetime('now')
      WHERE id=?
    `).run(sku, name, description || null, category_id || null, cost_price || 0, sale_price, unit || 'pcs', tax_rate || 0, min_stock || 0, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });

    const product = db.prepare(`
      SELECT p.*, c.name as category_name, COALESCE(sl.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      WHERE p.id = ?
    `).get(req.params.id);

    res.json(product);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
