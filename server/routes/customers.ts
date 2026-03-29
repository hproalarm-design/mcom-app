import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const customers = db.prepare(`
      SELECT c.*, COUNT(i.id) as invoice_count,
             COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as total_paid
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, email, phone, address, city, country, tax_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = db.prepare(`
      INSERT INTO customers (name, email, phone, address, city, country, tax_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, email || null, phone || null, address || null, city || null, country || null, tax_number || null);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, email, phone, address, city, country, tax_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = db.prepare(`
      UPDATE customers SET name=?, email=?, phone=?, address=?, city=?, country=?, tax_number=? WHERE id=?
    `).run(name, email || null, phone || null, address || null, city || null, country || null, tax_number || null, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const invoiceCount = (db.prepare('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?').get(req.params.id) as { count: number }).count;
    if (invoiceCount > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with existing invoices' });
    }

    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;
