import { Router } from 'express';
import db from '../db';

const router = Router();

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const last = db.prepare(`
    SELECT invoice_number FROM invoices
    WHERE invoice_number LIKE 'INV-${year}-%'
    ORDER BY id DESC LIMIT 1
  `).get() as { invoice_number: string } | undefined;

  let num = 1;
  if (last) {
    const parts = last.invoice_number.split('-');
    num = parseInt(parts[2]) + 1;
  }
  return `INV-${year}-${String(num).padStart(4, '0')}`;
}

router.get('/', (_req, res) => {
  try {
    const invoices = db.prepare(`
      SELECT i.*, c.name as customer_name, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
    `).all();
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.email as customer_email,
             c.phone as customer_phone, c.address as customer_address,
             c.city as customer_city, c.country as customer_country,
             c.tax_number as customer_tax_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const items = db.prepare(`
      SELECT ii.*, p.name as product_name, p.unit
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `).all(req.params.id);

    res.json({ ...invoice as object, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.post('/', (req, res) => {
  try {
    const { customer_id, issue_date, due_date, status, discount, notes, items } = req.body;

    if (!issue_date || !due_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'issue_date, due_date, and items are required' });
    }

    const createInvoice = db.transaction(() => {
      const invoice_number = generateInvoiceNumber();

      let subtotal = 0;
      let tax_amount = 0;

      for (const item of items) {
        const amount = item.quantity * item.unit_price;
        subtotal += amount;
        tax_amount += amount * (item.tax_rate / 100);
      }

      const disc = discount || 0;
      const total = subtotal + tax_amount - disc;

      const result = db.prepare(`
        INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, tax_amount, discount, total, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invoice_number, customer_id || null, issue_date, due_date, status || 'draft', subtotal, tax_amount, disc, total, notes || null);

      const invoiceId = result.lastInsertRowid;

      for (const item of items) {
        const amount = item.quantity * item.unit_price;
        db.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(invoiceId, item.product_id || null, item.description, item.quantity, item.unit_price, item.tax_rate || 0, amount);
      }

      // If paid, update stock
      if (status === 'paid') {
        for (const item of items) {
          if (item.product_id) {
            const stock = db.prepare('SELECT quantity FROM stock_levels WHERE product_id = ?').get(item.product_id) as { quantity: number } | undefined;
            if (stock) {
              const newQty = Math.max(0, stock.quantity - item.quantity);
              db.prepare(`UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`).run(newQty, item.product_id);
              db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, reference, notes) VALUES (?, 'out', ?, ?, 'Invoice sale')`).run(item.product_id, item.quantity, invoice_number);
            }
          }
        }
      }

      return invoiceId;
    });

    const invoiceId = createInvoice();
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?
    `).get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

    res.status(201).json({ ...invoice as object, items: invoiceItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { customer_id, issue_date, due_date, status, discount, notes, items } = req.body;

    if (!issue_date || !due_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'issue_date, due_date, and items are required' });
    }

    const updateInvoice = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as { status: string; invoice_number: string } | undefined;
      if (!existing) throw new Error('Not found');

      let subtotal = 0;
      let tax_amount = 0;

      for (const item of items) {
        const amount = item.quantity * item.unit_price;
        subtotal += amount;
        tax_amount += amount * (item.tax_rate / 100);
      }

      const disc = discount || 0;
      const total = subtotal + tax_amount - disc;

      db.prepare(`
        UPDATE invoices SET customer_id=?, issue_date=?, due_date=?, status=?, subtotal=?, tax_amount=?, discount=?, total=?, notes=?, updated_at=datetime('now')
        WHERE id=?
      `).run(customer_id || null, issue_date, due_date, status || 'draft', subtotal, tax_amount, disc, total, notes || null, req.params.id);

      // Delete existing items
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);

      // Insert new items
      for (const item of items) {
        const amount = item.quantity * item.unit_price;
        db.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(req.params.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.tax_rate || 0, amount);
      }

      // If newly set to paid, update stock
      if (status === 'paid' && existing.status !== 'paid') {
        for (const item of items) {
          if (item.product_id) {
            const stock = db.prepare('SELECT quantity FROM stock_levels WHERE product_id = ?').get(item.product_id) as { quantity: number } | undefined;
            if (stock) {
              const newQty = Math.max(0, stock.quantity - item.quantity);
              db.prepare(`UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`).run(newQty, item.product_id);
              db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, reference, notes) VALUES (?, 'out', ?, ?, 'Invoice sale')`).run(item.product_id, item.quantity, existing.invoice_number);
            }
          }
        }
      }
    });

    updateInvoice();

    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?
    `).get(req.params.id);
    const invoiceItems = db.prepare(`
      SELECT ii.*, p.name as product_name, p.unit FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ?
    `).all(req.params.id);

    res.json({ ...invoice as object, items: invoiceItems });
  } catch (err: any) {
    console.error(err);
    if (err.message === 'Not found') return res.status(404).json({ error: 'Invoice not found' });
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const updateStatus = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as { status: string; invoice_number: string; id: number } | undefined;
      if (!existing) throw new Error('Not found');

      db.prepare(`UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);

      // If newly set to paid, update stock
      if (status === 'paid' && existing.status !== 'paid') {
        const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(existing.id) as Array<{ product_id: number; quantity: number }>;
        for (const item of items) {
          if (item.product_id) {
            const stock = db.prepare('SELECT quantity FROM stock_levels WHERE product_id = ?').get(item.product_id) as { quantity: number } | undefined;
            if (stock) {
              const newQty = Math.max(0, stock.quantity - item.quantity);
              db.prepare(`UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`).run(newQty, item.product_id);
              db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, reference, notes) VALUES (?, 'out', ?, ?, 'Invoice sale')`).run(item.product_id, item.quantity, existing.invoice_number);
            }
          }
        }
      }
    });

    updateStatus();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    res.json(invoice);
  } catch (err: any) {
    console.error(err);
    if (err.message === 'Not found') return res.status(404).json({ error: 'Invoice not found' });
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

export default router;
