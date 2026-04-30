import { Router } from 'express';
import db from '../db';

const router = Router();

// Export all data as a JSON backup
router.get('/export', (_req, res) => {
  try {
    const data = {
      version: 1,
      app: 'mcom-app',
      exported_at: new Date().toISOString(),
      categories: db.prepare('SELECT * FROM categories').all(),
      products: db.prepare('SELECT * FROM products').all(),
      customers: db.prepare('SELECT * FROM customers').all(),
      stock_levels: db.prepare('SELECT * FROM stock_levels').all(),
      stock_movements: db.prepare('SELECT * FROM stock_movements').all(),
      invoices: db.prepare('SELECT * FROM invoices').all(),
      invoice_items: db.prepare('SELECT * FROM invoice_items').all(),
      quotations: db.prepare('SELECT * FROM quotations').all(),
      quotation_items: db.prepare('SELECT * FROM quotation_items').all(),
    };
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export backup' });
  }
});

// Import a JSON backup (replaces all existing data)
router.post('/import', (req, res) => {
  try {
    const data = req.body;

    // Validate top-level structure
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid backup: expected a JSON object' });
    }
    if (data.app !== 'mcom-app' || data.version !== 1) {
      return res.status(400).json({ error: 'Invalid backup: unrecognised format or version' });
    }
    const requiredArrays = ['categories', 'products', 'customers', 'invoices', 'quotations'];
    for (const key of requiredArrays) {
      if (!Array.isArray(data[key])) {
        return res.status(400).json({ error: `Invalid backup: "${key}" must be an array` });
      }
    }

    const importAll = db.transaction(() => {
      // Clear all tables in dependency order
      db.prepare('DELETE FROM quotation_items').run();
      db.prepare('DELETE FROM quotations').run();
      db.prepare('DELETE FROM invoice_items').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM stock_movements').run();
      db.prepare('DELETE FROM stock_levels').run();
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM customers').run();
      db.prepare('DELETE FROM categories').run();

      // Reset auto-increment counters
      db.prepare(
        `DELETE FROM sqlite_sequence WHERE name IN (
          'categories','products','customers','stock_levels','stock_movements',
          'invoices','invoice_items','quotations','quotation_items'
        )`
      ).run();

      // Insert categories
      if (data.categories?.length) {
        const s = db.prepare('INSERT INTO categories (id,name,description,created_at) VALUES (?,?,?,?)');
        for (const r of data.categories) s.run(r.id, r.name, r.description ?? null, r.created_at);
      }

      // Insert products
      if (data.products?.length) {
        const s = db.prepare(`INSERT INTO products
          (id,sku,name,description,category_id,cost_price,sale_price,unit,tax_rate,min_stock,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const r of data.products) {
          s.run(r.id, r.sku, r.name, r.description ?? null, r.category_id ?? null,
            r.cost_price ?? 0, r.sale_price, r.unit ?? 'pcs', r.tax_rate ?? 0,
            r.min_stock ?? 0, r.created_at, r.updated_at);
        }
      }

      // Insert customers
      if (data.customers?.length) {
        const s = db.prepare(`INSERT INTO customers
          (id,name,email,phone,address,city,country,tax_number,created_at)
          VALUES (?,?,?,?,?,?,?,?,?)`);
        for (const r of data.customers) {
          s.run(r.id, r.name, r.email ?? null, r.phone ?? null, r.address ?? null,
            r.city ?? null, r.country ?? null, r.tax_number ?? null, r.created_at);
        }
      }

      // Insert stock levels
      if (data.stock_levels?.length) {
        const s = db.prepare('INSERT INTO stock_levels (id,product_id,quantity,updated_at) VALUES (?,?,?,?)');
        for (const r of data.stock_levels) s.run(r.id, r.product_id, r.quantity ?? 0, r.updated_at);
      }

      // Insert stock movements
      if (data.stock_movements?.length) {
        const s = db.prepare(`INSERT INTO stock_movements
          (id,product_id,type,quantity,reference,notes,created_at)
          VALUES (?,?,?,?,?,?,?)`);
        for (const r of data.stock_movements) {
          s.run(r.id, r.product_id, r.type, r.quantity, r.reference ?? null, r.notes ?? null, r.created_at);
        }
      }

      // Insert invoices
      if (data.invoices?.length) {
        const s = db.prepare(`INSERT INTO invoices
          (id,invoice_number,customer_id,issue_date,due_date,status,subtotal,tax_amount,discount,total,notes,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const r of data.invoices) {
          s.run(r.id, r.invoice_number, r.customer_id ?? null, r.issue_date, r.due_date,
            r.status, r.subtotal ?? 0, r.tax_amount ?? 0, r.discount ?? 0,
            r.total ?? 0, r.notes ?? null, r.created_at, r.updated_at);
        }
      }

      // Insert invoice items
      if (data.invoice_items?.length) {
        const s = db.prepare(`INSERT INTO invoice_items
          (id,invoice_id,product_id,description,quantity,unit_price,tax_rate,amount)
          VALUES (?,?,?,?,?,?,?,?)`);
        for (const r of data.invoice_items) {
          s.run(r.id, r.invoice_id, r.product_id ?? null, r.description,
            r.quantity, r.unit_price, r.tax_rate ?? 0, r.amount);
        }
      }

      // Insert quotations
      if (data.quotations?.length) {
        const s = db.prepare(`INSERT INTO quotations
          (id,quotation_number,customer_id,issue_date,validity_date,status,subtotal,tax_amount,discount,total,notes,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const r of data.quotations) {
          s.run(r.id, r.quotation_number, r.customer_id ?? null, r.issue_date, r.validity_date,
            r.status, r.subtotal ?? 0, r.tax_amount ?? 0, r.discount ?? 0,
            r.total ?? 0, r.notes ?? null, r.created_at, r.updated_at);
        }
      }

      // Insert quotation items
      if (data.quotation_items?.length) {
        const s = db.prepare(`INSERT INTO quotation_items
          (id,quotation_id,product_id,description,quantity,unit_price,tax_rate,amount)
          VALUES (?,?,?,?,?,?,?,?)`);
        for (const r of data.quotation_items) {
          s.run(r.id, r.quotation_id, r.product_id ?? null, r.description,
            r.quantity, r.unit_price, r.tax_rate ?? 0, r.amount);
        }
      }
    });

    importAll();

    res.json({
      message: 'Backup imported successfully',
      counts: {
        categories: data.categories?.length ?? 0,
        products: data.products?.length ?? 0,
        customers: data.customers?.length ?? 0,
        stock_levels: data.stock_levels?.length ?? 0,
        stock_movements: data.stock_movements?.length ?? 0,
        invoices: data.invoices?.length ?? 0,
        quotations: data.quotations?.length ?? 0,
      },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to import backup' });
  }
});

export default router;
