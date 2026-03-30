import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Pencil, Trash2, Printer, ChevronDown, Download, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getQuotations, deleteQuotation, updateQuotationStatus, convertQuotationToInvoice } from '../api/client';
import type { Quotation, QuotationStatus } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);
}

function statusVariant(status: string): 'success' | 'info' | 'danger' | 'default' | 'warning' | 'purple' {
  switch (status) {
    case 'accepted': return 'success';
    case 'sent': return 'info';
    case 'rejected': return 'danger';
    case 'expired': return 'default';
    default: return 'warning'; // draft
  }
}

const STATUS_OPTIONS: { value: QuotationStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusModal, setStatusModal] = useState<{ id: number; current: QuotationStatus } | null>(null);
  const [newStatus, setNewStatus] = useState<QuotationStatus>('draft');
  const [convertId, setConvertId] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);

  const load = () => {
    setLoading(true);
    getQuotations()
      .then(setQuotations)
      .catch(() => toast.error('Failed to load quotations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filterStatus ? quotations.filter(q => q.status === filterStatus) : quotations;

  const handleDelete = async (id: number) => {
    try {
      await deleteQuotation(id);
      setQuotations(qs => qs.filter(q => q.id !== id));
      toast.success('Quotation deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quotation');
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusChange = async () => {
    if (!statusModal) return;
    try {
      const updated = await updateQuotationStatus(statusModal.id, newStatus);
      setQuotations(qs => qs.map(q => q.id === updated.id ? { ...q, status: updated.status } : q));
      toast.success('Status updated');
      setStatusModal(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleConvert = async () => {
    if (!convertId) return;
    setConverting(true);
    try {
      const invoice = await convertQuotationToInvoice(convertId);
      toast.success(`Converted to invoice ${invoice.invoice_number}`);
      setConvertId(null);
      load(); // Refresh to show updated status
      navigate('/invoices');
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert quotation');
    } finally {
      setConverting(false);
    }
  };

  const exportExcel = () => {
    const rows = quotations.map(q => ({
      'Quotation No': q.quotation_number,
      Customer: q.customer_name || '',
      'Issue Date': format(new Date(q.issue_date), 'yyyy-MM-dd'),
      'Valid Until': format(new Date(q.validity_date), 'yyyy-MM-dd'),
      Status: q.status,
      Total: q.total,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
    XLSX.writeFile(wb, 'quotations.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Quotation List', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Quotation No', 'Customer', 'Issue Date', 'Valid Until', 'Status', 'Total (RM)']],
      body: quotations.map(q => [
        q.quotation_number,
        q.customer_name || '',
        format(new Date(q.issue_date), 'yyyy-MM-dd'),
        format(new Date(q.validity_date), 'yyyy-MM-dd'),
        q.status,
        q.total.toFixed(2),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save('quotations.pdf');
  };

  const totals = {
    total: quotations.reduce((s, q) => s + q.total, 0),
    accepted: quotations.filter(q => q.status === 'accepted').reduce((s, q) => s + q.total, 0),
    pending: quotations.filter(q => ['draft', 'sent'].includes(q.status)).reduce((s, q) => s + q.total, 0),
  };

  const convertQuote = quotations.find(q => q.id === convertId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-slate-500 text-sm mt-1">{quotations.length} quotations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <Download size={16} /> Export Excel
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <FileText size={16} /> Export PDF
          </Button>
          <Link to="/quotations/new">
            <Button><Plus size={16} /> New Quotation</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Quoted', amount: totals.total, color: 'slate' },
          { label: 'Accepted', amount: totals.accepted, color: 'green' },
          { label: 'Pending', amount: totals.pending, color: 'orange' },
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
          {['', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map(s => (
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
          <p className="text-slate-500 font-medium">No quotations found</p>
          <Link to="/quotations/new">
            <Button className="mt-4"><Plus size={16} /> New Quotation</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quotation #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valid Until</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm font-medium text-blue-600">{q.quotation_number}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{q.customer_name || 'No customer'}</p>
                      {q.customer_email && <p className="text-xs text-slate-400">{q.customer_email}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{format(new Date(q.issue_date), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{format(new Date(q.validity_date), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(q.total)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => { setStatusModal({ id: q.id, current: q.status }); setNewStatus(q.status); }}
                        className="flex items-center gap-1 group"
                      >
                        <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
                        <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600" />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setConvertId(q.id)}
                          title="Convert to Invoice"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <ArrowRight size={15} />
                        </button>
                        <Link to={`/quotations/${q.id}/print`} target="_blank">
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                            <Printer size={15} />
                          </button>
                        </Link>
                        <Link to={`/quotations/${q.id}/edit`}>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Pencil size={15} />
                          </button>
                        </Link>
                        <button onClick={() => setDeleteId(q.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
      <Modal open={statusModal !== null} onClose={() => setStatusModal(null)} title="Change Quotation Status" size="sm">
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as QuotationStatus)}
            options={STATUS_OPTIONS}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStatusModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleStatusChange} className="flex-1">Update Status</Button>
          </div>
        </div>
      </Modal>

      {/* Convert to Invoice Modal */}
      <Modal open={convertId !== null} onClose={() => setConvertId(null)} title="Convert to Invoice" size="sm">
        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            Convert <span className="font-semibold">{convertQuote?.quotation_number}</span> to an invoice?
            The quotation will be marked as <span className="font-semibold text-green-600">accepted</span> and a new draft invoice will be created.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConvertId(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleConvert} loading={converting} className="flex-1">Convert to Invoice</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Quotation" size="sm">
        <p className="text-slate-600 text-sm">Are you sure you want to delete this quotation? This action cannot be undone.</p>
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
