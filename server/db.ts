import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'mcom.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER REFERENCES categories(id),
      cost_price REAL DEFAULT 0,
      sale_price REAL NOT NULL,
      unit TEXT DEFAULT 'pcs',
      tax_rate REAL DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER UNIQUE REFERENCES products(id),
      quantity REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      tax_number TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      issue_date TEXT NOT NULL,
      validity_date TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      amount REAL NOT NULL
    );
  `);

  seedDatabase();
}

function seedDatabase() {
  const categoryCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count;
  if (categoryCount > 0) return;

  // Seed categories
  const insertCategory = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  const categories = [
    ['Electronics', 'Electronic devices and components'],
    ['Office Supplies', 'Stationery and office materials'],
    ['Furniture', 'Office and home furniture'],
    ['Software', 'Software licenses and subscriptions'],
    ['Accessories', 'Various accessories and peripherals'],
  ];
  categories.forEach(([name, desc]) => insertCategory.run(name, desc));

  // Seed products
  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, description, category_id, cost_price, sale_price, unit, tax_rate, min_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const products = [
    ['ELEC-001', 'Laptop Pro 15"', 'High performance laptop', 1, 800, 1299.99, 'pcs', 20, 5],
    ['ELEC-002', 'Wireless Mouse', 'Ergonomic wireless mouse', 1, 15, 39.99, 'pcs', 20, 20],
    ['ELEC-003', 'USB-C Hub', '7-in-1 USB-C hub', 1, 20, 59.99, 'pcs', 20, 15],
    ['OFF-001', 'A4 Paper Ream', '500 sheets A4 paper', 2, 3, 8.99, 'ream', 10, 50],
    ['OFF-002', 'Ballpoint Pens Box', 'Box of 50 ballpoint pens', 2, 4, 12.99, 'box', 10, 30],
    ['FURN-001', 'Ergonomic Chair', 'Adjustable office chair', 3, 150, 399.99, 'pcs', 20, 3],
    ['FURN-002', 'Standing Desk', 'Height adjustable desk', 3, 300, 699.99, 'pcs', 20, 2],
    ['SW-001', 'Office Suite License', 'Annual office suite license', 4, 80, 149.99, 'license', 0, 0],
    ['ACC-001', 'Monitor Stand', 'Adjustable monitor stand', 5, 25, 79.99, 'pcs', 20, 10],
    ['ACC-002', 'Cable Management Kit', 'Cable organizer kit', 5, 8, 24.99, 'kit', 20, 20],
  ];
  products.forEach(p => insertProduct.run(...p));

  // Seed stock levels
  const insertStock = db.prepare('INSERT INTO stock_levels (product_id, quantity) VALUES (?, ?)');
  const stockQtys = [12, 45, 30, 120, 60, 8, 4, 25, 22, 35];
  stockQtys.forEach((qty, i) => insertStock.run(i + 1, qty));

  // Seed customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, email, phone, address, city, country, tax_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const customers = [
    ['Acme Corporation', 'billing@acme.com', '+1-555-0100', '123 Business Ave', 'New York', 'USA', 'US-TAX-001'],
    ['TechStart Ltd', 'accounts@techstart.io', '+1-555-0101', '456 Innovation St', 'San Francisco', 'USA', 'US-TAX-002'],
    ['Global Traders', 'finance@globaltraders.com', '+44-20-7946-0958', '789 Commerce Rd', 'London', 'UK', 'GB-VAT-001'],
    ['Blue Sky Agency', 'hello@bluesky.agency', '+1-555-0102', '321 Creative Blvd', 'Austin', 'USA', null],
    ['Summit Consulting', 'ap@summitconsult.biz', '+1-555-0103', '654 Executive Dr', 'Chicago', 'USA', 'US-TAX-003'],
  ];
  customers.forEach(c => insertCustomer.run(...c));

  // Seed invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, tax_amount, discount, total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Invoice 1 - paid
  const inv1 = insertInvoice.run('INV-2026-0001', 1, '2026-03-01', '2026-03-31', 'paid', 1339.98, 267.996, 0, 1607.976, 'Thank you for your business');
  insertItem.run(inv1.lastInsertRowid, 1, 'Laptop Pro 15"', 1, 1299.99, 20, 1299.99);
  insertItem.run(inv1.lastInsertRowid, 2, 'Wireless Mouse', 1, 39.99, 20, 39.99);

  // Invoice 2 - sent
  const inv2 = insertInvoice.run('INV-2026-0002', 2, '2026-03-10', '2026-04-09', 'sent', 459.98, 91.996, 0, 551.976, null);
  insertItem.run(inv2.lastInsertRowid, 6, 'Ergonomic Chair', 1, 399.99, 20, 399.99);
  insertItem.run(inv2.lastInsertRowid, 9, 'Monitor Stand', 1, 59.99, 20, 59.99);

  // Invoice 3 - draft
  const inv3 = insertInvoice.run('INV-2026-0003', 3, '2026-03-20', '2026-04-19', 'draft', 149.99, 0, 0, 149.99, 'Annual license renewal');
  insertItem.run(inv3.lastInsertRowid, 8, 'Office Suite License', 1, 149.99, 0, 149.99);

  // Record stock movements for paid invoice
  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (product_id, type, quantity, reference, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMovement.run(1, 'out', 1, 'INV-2026-0001', 'Invoice sale');
  insertMovement.run(2, 'out', 1, 'INV-2026-0001', 'Invoice sale');

  // Some additional stock in movements
  insertMovement.run(1, 'in', 15, 'PO-2026-001', 'Purchase order restock');
  insertMovement.run(2, 'in', 50, 'PO-2026-001', 'Purchase order restock');
  insertMovement.run(4, 'in', 200, 'PO-2026-002', 'Purchase order restock');
}

export default db;
