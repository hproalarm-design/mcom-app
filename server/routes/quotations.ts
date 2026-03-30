import { Router } from 'express';
import db from '../db';

const router = Router();

function generateQuotationNumber(): string {
  const year = new Date().getFullYear();
  const last = db.prepare(`
    SELECT quotation_number FROM quotations
    WHERE quotation_number LIKE 'QUO-${year}-%'
    ORDER BY id DESC LIMIT 1
  `).get() as { quotation_number: string } | undefined;

  let num = 1;
  if (last) {
    const parts = last.quotation_number.split('-');
    num = parseInt(parts[2]) + 1;
  }
  return `QUO-${year}-${String(num).padStart(4, '0')}`;
}

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
    const quotations = db.prepare(`
      SELECT q.*, c.name as customer_name, c.email as customer_email
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      ORDER BY q.created_at DESC
    `).all();
    res.json(quotations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const quotation = db.prepare(`
      SELECT q.*, c.name as customer_name, c.email as customer_email,
             c.phone as customer_phone, c.address as customer_address,
             c.city as customer_city, c.country as customer_country,
             c.tax_number as customer_tax_number
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ?
    `).get(req.params.id);

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const items = db.prepare(`
      SELECT qi.*, p.name as product_name, p.unit
      FROM quotation_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      WHERE qi.quotation_id = ?
    `).all(req.params.id);

    res.json({ ...quotation as object, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

router.post('/', (req, res) => {
  try {
    const { customer_id, issue_date, validity_date, status, discount, notes, items } = req.body;

    if (!issue_date || !validity_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'issue_date, validity_date, and items are required' });
    }

    const createQuotation = db.transaction(() => {
      const quotation_number = generateQuotationNumber();

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
        INSERT INTO quotations (quotation_number, customer_id, issue_date, validity_date, status, subtotal, tax_amount, discount, total, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(quotation_number, customer_id || null, issue_date, validity_date, status || 'draft', subtotal, tax_amount, disc, total, notes || null);

      const quotationId = result.lastInsertRowid;

      for (const item of items) {
        const amount = item.quantity * item.unit_price;
        db.prepare(`
          INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, tax_rate, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(quotationId, item.product_id || null, item.description, item.quantity, item.unit_price, item.tax_rate || 0, amount);
      }

      return quotationId;
    });

    const quotationId = createQuotation();
    const quotation = db.prepare(`
      SELECT q.*, c.name as customer_name FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ?
    `).get(quotationId);
    const quotationItems = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotationId);

    res.status(201).json({ ...quotation as object, items: quotationItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { customer_id, issue_date, validity_date, status, discount, notes, items } = req.body;

    if (!issue_date || !validity_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'issue_date, validity_date, and items are required' });
    }

    const updateQuotation = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
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
        UPDATE quotations SET customer_id=?, issue_date=?, validity_date=?, status=?, subtotal=?, tax_amount=?, discount=?, total=?, notes=?, updated_at=datetime('now')
        WHERE id=?
      `).run(customer_id || null, issue_date, validity_date, status || 'draft', subtotal, tax_amount, disc, total, notes || null, req.params.id);

      db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(req.params.id);

      for (const item of items) {
        const amount = item.quantity * item.unit_price;
        db.prepare(`
          INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, tax_rate, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(req.params.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.tax_rate || 0, amount);
      }
    });

    updateQuotation();

    const quotation = db.prepare(`
      SELECT q.*, c.name as customer_name FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ?
    `).get(req.params.id);
    const quotationItems = db.prepare(`
      SELECT qi.*, p.name as product_name, p.unit FROM quotation_items qi
      LEFT JOIN products p ON qi.product_id = p.id WHERE qi.quotation_id = ?
    `).all(req.params.id);

    res.json({ ...quotation as object, items: quotationItems });
  } catch (err: any) {
    console.error(err);
    if (err.message === 'Not found') return res.status(404).json({ error: 'Quotation not found' });
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM quotations WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Quotation not found' });
    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});

router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });

    db.prepare(`UPDATE quotations SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    res.json(quotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update quotation status' });
  }
});

// Convert quotation to invoice
router.post('/:id/convert', (req, res) => {
  try {
    const convert = db.transaction(() => {
      const quotation = db.prepare(`
        SELECT * FROM quotations WHERE id = ?
      `).get(req.params.id) as {
        id: number; customer_id: number | null; issue_date: string; validity_date: string;
        subtotal: number; tax_amount: number; discount: number; total: number; notes: string | null;
      } | undefined;

      if (!quotation) throw new Error('Not found');

      const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotation.id) as Array<{
        product_id: number | null; description: string; quantity: number; unit_price: number; tax_rate: number; amount: number;
      }>;

      const invoice_number = generateInvoiceNumber();

      // Use today as issue_date, validity_date + 30 days as due_date
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const result = db.prepare(`
        INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, tax_amount, discount, total, notes)
        VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
      `).run(invoice_number, quotation.customer_id, today, dueDate, quotation.subtotal, quotation.tax_amount, quotation.discount, quotation.total, quotation.notes);

      const invoiceId = result.lastInsertRowid;

      for (const item of items) {
        db.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.tax_rate, item.amount);
      }

      // Mark quotation as accepted
      db.prepare(`UPDATE quotations SET status = 'accepted', updated_at = datetime('now') WHERE id = ?`).run(quotation.id);

      return invoiceId;
    });

    const invoiceId = convert();
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?
    `).get(invoiceId);

    res.status(201).json(invoice);
  } catch (err: any) {
    console.error(err);
    if (err.message === 'Not found') return res.status(404).json({ error: 'Quotation not found' });
    res.status(500).json({ error: 'Failed to convert quotation to invoice' });
  }
});

export default router;
