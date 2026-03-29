import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Eye, Pencil, Trash2, Printer, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getInvoices, deleteInvoice, updateInvoiceStatus } from '../api/client';
import type { Invoice, InvoiceStatus } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function statusVariant(status: string): 'success' | 'info' | 'danger' | 'default' | 'warning' | 'purple' {
  switch (status) {
    case 'paid': return 'success';
    case 'sent': return 'info';
    case 'overdue': return 'danger';
    case 'cancelled': return 'default';
    default: return 'warning'; // draft
  }
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusModal, setStatusModal] = useState<{ id: number; current: InvoiceStatus } | null>(null);
  const [newStatus, setNewStatus] = useState<InvoiceStatus>('draft');

  const load = () => {
    setLoading(true);
    getInvoices()
      .then(setInvoices)
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filterStatus ? invoices.filter(i => i.status === filterStatus) : invoices;

  const handleDelete = async (id: number) => {
    try {
      await deleteInvoice(id);
      setInvoices(inv => inv.filter(i => i.id !== id));
      toast.success('Invoice deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice');
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusChange = async () => {
    if (!statusModal) return;
    try {
      const updated = await updateInvoiceStatus(statusModal.id, newStatus);
      setInvoices(inv => inv.map(i => i.id === updated.id ? { ...i, status: updated.status } : i));
      toast.success('Status updated');
      setStatusModal(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const totals = {
    total: invoices.reduce((s, i) => s + i.total, 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    pending: invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">{invoices.length} invoices</p>
        </div>
        <Link to="/invoices/new">
          <Button><Plus size={16} /> New Invoice</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Invoiced', amount: totals.total, color: 'slate' },
          { label: 'Paid', amount: totals.paid, color: 'green' },
          { label: 'Outstanding', amount: totals.pending, color: 'orange' },
        ].map(({ label, amount, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-xl font-bold mt-1 text-${color}-600`}>{formatCurrency(amount)}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Filter by status:</span>
        <div className="flex gap-2 flex-wrap">
          {['', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No invoices found</p>
          <Link to="/invoices/new">
            <Button className="mt-4"><Plus size={16} /> New Invoice</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm font-medium text-blue-600">{inv.invoice_number}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{inv.customer_name || 'No customer'}</p>
                      {inv.customer_email && <p className="text-xs text-slate-400">{inv.customer_email}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{format(new Date(inv.issue_date), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{format(new Date(inv.due_date), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(inv.total)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => { setStatusModal({ id: inv.id, current: inv.status }); setNewStatus(inv.status); }}
                        className="flex items-center gap-1 group"
                      >
                        <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                        <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600" />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link to={`/invoices/${inv.id}/print`} target="_blank">
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                            <Printer size={15} />
                          </button>
                        </Link>
                        <Link to={`/invoices/${inv.id}/edit`}>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Pencil size={15} />
                          </button>
                        </Link>
                        <button onClick={() => setDeleteId(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      <Modal open={statusModal !== null} onClose={() => setStatusModal(null)} title="Change Invoice Status" size="sm">
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as InvoiceStatus)}
            options={STATUS_OPTIONS}
          />
          {newStatus === 'paid' && statusModal?.current !== 'paid' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              Marking as paid will automatically deduct items from stock inventory.
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStatusModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleStatusChange} className="flex-1">Update Status</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Invoice" size="sm">
        <p className="text-slate-600 text-sm">Are you sure you want to delete this invoice? This action cannot be undone.</p>
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
