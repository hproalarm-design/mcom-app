import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = db.prepare('UPDATE categories SET name=?, description=? WHERE id=?').run(name, description || null, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    // Check if category has products
    const productCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(req.params.id) as { count: number }).count;
    if (productCount > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing products' });
    }

    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
