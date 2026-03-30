import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, TrendingUp, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { getDashboardStats } from '../api/client';
import type { DashboardStats } from '../types';
import Badge from '../components/ui/Badge';

function statusVariant(status: string) {
  switch (status) {
    case 'paid': return 'success';
    case 'sent': return 'info';
    case 'overdue': return 'danger';
    case 'cancelled': return 'default';
    default: return 'warning';
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back to Mcom</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Products</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.totalProducts ?? 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="text-blue-600" size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Low Stock Alerts</p>
              <p className={`text-3xl font-bold mt-1 ${(stats?.lowStockAlerts ?? 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {stats?.lowStockAlerts ?? 0}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(stats?.lowStockAlerts ?? 0) > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertTriangle className={(stats?.lowStockAlerts ?? 0) > 0 ? 'text-red-600' : 'text-green-600'} size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Monthly Revenue</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(stats?.monthlyRevenue ?? 0)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-green-600" size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Unpaid Invoices</p>
              <p className={`text-3xl font-bold mt-1 ${(stats?.unpaidInvoices ?? 0) > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                {stats?.unpaidInvoices ?? 0}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(stats?.unpaidInvoices ?? 0) > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
              <FileText className={(stats?.unpaidInvoices ?? 0) > 0 ? 'text-orange-600' : 'text-slate-600'} size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
            <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {!stats?.recentInvoices?.length ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No invoices yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.recentInvoices.map(inv => (
                <div key={inv.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-500">{inv.customer_name || 'No customer'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(inv.total)}</p>
                    <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Low Stock Alerts</h2>
            <Link to="/stock" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Manage stock <ArrowRight size={14} />
            </Link>
          </div>
          {!stats?.stockAlerts?.length ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">All stock levels are healthy</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.stockAlerts.map(item => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{item.quantity} {item.unit}</p>
                    <p className="text-xs text-slate-400">min: {item.min_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { to: '/invoices/new', label: 'New Invoice', color: 'blue' },
          { to: '/products', label: 'Add Product', color: 'green' },
          { to: '/customers', label: 'Add Customer', color: 'purple' },
          { to: '/stock', label: 'Update Stock', color: 'orange' },
        ].map(({ to, label, color }) => (
          <Link
            key={to}
            to={to}
            className={`bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-${color}-300 hover:shadow-md transition-all text-center group`}
          >
            <p className={`text-sm font-medium text-slate-700 group-hover:text-${color}-600`}>{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
