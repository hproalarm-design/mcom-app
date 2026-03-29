import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/stats', (_req, res) => {
  try {
    const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;

    const lowStockAlerts = (db.prepare(`
      SELECT COUNT(*) as count FROM stock_levels sl
      JOIN products p ON sl.product_id = p.id
      WHERE sl.quantity <= p.min_stock
    `).get() as { count: number }).count;

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

    const monthlyRevenue = (db.prepare(`
      SELECT COALESCE(SUM(total), 0) as revenue FROM invoices
      WHERE status = 'paid' AND issue_date >= ? AND issue_date <= ?
    `).get(monthStart, monthEnd) as { revenue: number }).revenue;

    const unpaidInvoices = (db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE status IN ('sent', 'overdue')
    `).get() as { count: number }).count;

    const recentInvoices = db.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `).all();

    const stockAlerts = db.prepare(`
      SELECT p.id, p.name, p.sku, p.min_stock, p.unit, sl.quantity
      FROM stock_levels sl
      JOIN products p ON sl.product_id = p.id
      WHERE sl.quantity <= p.min_stock
      ORDER BY sl.quantity ASC
      LIMIT 10
    `).all();

    res.json({
      totalProducts,
      lowStockAlerts,
      monthlyRevenue,
      unpaidInvoices,
      recentInvoices,
      stockAlerts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
