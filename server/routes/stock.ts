import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const stock = db.prepare(`
      SELECT sl.*, p.name as product_name, p.sku, p.unit, p.min_stock,
             c.name as category_name
      FROM stock_levels sl
      JOIN products p ON sl.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name
    `).all();
    res.json(stock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock levels' });
  }
});

router.get('/movements', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const productId = req.query.product_id;

    let query = `
      SELECT sm.*, p.name as product_name, p.sku, p.unit
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
    `;
    const params: any[] = [];

    if (productId) {
      query += ' WHERE sm.product_id = ?';
      params.push(productId);
    }

    query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const movements = db.prepare(query).all(...params);

    const countQuery = productId
      ? 'SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ?'
      : 'SELECT COUNT(*) as count FROM stock_movements';
    const total = (db.prepare(countQuery).get(...(productId ? [productId] : [])) as { count: number }).count;

    res.json({ movements, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

router.post('/movement', (req, res) => {
  try {
    const { product_id, type, quantity, reference, notes } = req.body;
    if (!product_id || !type || quantity === undefined) {
      return res.status(400).json({ error: 'product_id, type, and quantity are required' });
    }
    if (!['in', 'out', 'adjustment'].includes(type)) {
      return res.status(400).json({ error: 'type must be in, out, or adjustment' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be positive' });
    }

    const updateStock = db.transaction(() => {
      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, reference, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(product_id, type, quantity, reference || null, notes || null);

      // Update stock level
      const current = db.prepare('SELECT quantity FROM stock_levels WHERE product_id = ?').get(product_id) as { quantity: number } | undefined;

      if (!current) {
        return res.status(404).json({ error: 'Product stock level not found' });
      }

      let newQty: number;
      if (type === 'in') {
        newQty = current.quantity + quantity;
      } else if (type === 'out') {
        newQty = current.quantity - quantity;
        if (newQty < 0) throw new Error('Insufficient stock');
      } else {
        // adjustment: quantity is the new absolute value
        newQty = quantity;
      }

      db.prepare(`
        UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?
      `).run(newQty, product_id);

      return newQty;
    });

    const newQty = updateStock();
    res.status(201).json({ message: 'Stock movement recorded', new_quantity: newQty });
  } catch (err: any) {
    console.error(err);
    if (err.message === 'Insufficient stock') {
      return res.status(400).json({ error: 'Insufficient stock for this operation' });
    }
    res.status(500).json({ error: 'Failed to record stock movement' });
  }
});

router.put('/adjust/:productId', (req, res) => {
  try {
    const { quantity, notes } = req.body;
    const productId = req.params.productId;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const doAdjust = db.transaction(() => {
      const current = db.prepare('SELECT quantity FROM stock_levels WHERE product_id = ?').get(productId) as { quantity: number } | undefined;
      if (!current) throw new Error('Product not found');

      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, reference, notes)
        VALUES (?, 'adjustment', ?, 'MANUAL', ?)
      `).run(productId, quantity, notes || 'Manual adjustment');

      db.prepare(`
        UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?
      `).run(quantity, productId);
    });

    doAdjust();
    res.json({ message: 'Stock adjusted successfully', new_quantity: quantity });
  } catch (err: any) {
    console.error(err);
    if (err.message === 'Product not found') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

export default router;
