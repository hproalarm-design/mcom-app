import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tag,
  Warehouse,
  FileText,
  Users,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/stock', icon: Warehouse, label: 'Stock' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
            M
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">Mcom</div>
            <div className="text-xs text-slate-400">Stock & Invoice</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">Mcom v1.0.0</p>
      </div>
    </aside>
  );
}
