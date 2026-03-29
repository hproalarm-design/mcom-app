import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getInvoice, createInvoice, updateInvoice, getCustomers, getProducts } from '../api/client';
import type { Customer, Product, InvoiceItem, InvoiceStatus } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const today = format(new Date(), 'yyyy-MM-dd');
const thirtyDaysLater = format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd');

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const emptyItem = (): InvoiceItem => ({
  product_id: null,
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  amount: 0,
});

export default function InvoiceForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(thirtyDaysLater);
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);

  useEffect(() => {
    const init = async () => {
      try {
        const [custs, prods] = await Promise.all([getCustomers(), getProducts()]);
        setCustomers(custs);
        setProducts(prods);

        if (isEdit && id) {
          const inv = await getInvoice(parseInt(id));
          setCustomerId(inv.customer_id ? String(inv.customer_id) : '');
          setIssueDate(inv.issue_date);
          setDueDate(inv.due_date);
          setStatus(inv.status);
          setDiscount(String(inv.discount));
          setNotes(inv.notes || '');
          setItems(inv.items && inv.items.length > 0 ? inv.items : [emptyItem()]);
        }
      } catch {
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  const recalcItem = (item: InvoiceItem): InvoiceItem => ({
    ...item,
    amount: item.quantity * item.unit_price,
  });

  const updateItem = (index: number, changes: Partial<InvoiceItem>) => {
    setItems(prev => {
      const updated = [...prev];
      const merged = { ...updated[index], ...changes };
      updated[index] = recalcItem(merged);
      return updated;
    });
  };

  const selectProduct = (index: number, productId: string) => {
    const prod = products.find(p => p.id === parseInt(productId));
    if (!prod) {
      updateItem(index, { product_id: null, description: '', unit_price: 0, tax_rate: 0 });
      return;
    }
    updateItem(index, {
      product_id: prod.id,
      description: prod.name,
      unit_price: prod.sale_price,
      tax_rate: prod.tax_rate,
    });
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = items.reduce((s, i) => s + i.amount * (i.tax_rate / 100), 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = subtotal + taxAmount - discountAmt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.description)) {
      toast.error('All line items need a description');
      return;
    }
    setSaving(true);
    const data = {
      customer_id: customerId ? parseInt(customerId) : undefined,
      issue_date: issueDate,
      due_date: dueDate,
      status,
      discount: discountAmt,
      notes: notes || undefined,
      items: items.map(i => ({
        product_id: i.product_id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: i.tax_rate,
        amount: i.amount,
      })),
    };

    try {
      if (isEdit && id) {
        await updateInvoice(parseInt(id), data);
        toast.success('Invoice updated');
      } else {
        await createInvoice(data);
        toast.success('Invoice created');
      }
      navigate('/invoices');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/invoices">
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{isEdit ? 'Update invoice details' : 'Create a new invoice'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Customer"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              options={customers.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select customer"
            />
            <Select
              label="Status"
              value={status}
              onChange={e => setStatus(e.target.value as InvoiceStatus)}
              options={STATUS_OPTIONS}
            />
            <div />
            <Input label="Issue Date" type="date" required value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            <Input label="Due Date" type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Line Items</h2>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus size={14} /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase px-1">
              <div className="col-span-3">Product</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-1">Tax%</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 md:col-span-3">
                  <select
                    value={item.product_id ? String(item.product_id) : ''}
                    onChange={e => selectProduct(idx, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-3">
                  <input
                    required
                    value={item.description}
                    onChange={e => updateItem(idx, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                  />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={item.quantity}
                    onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={item.unit_price}
                    onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={item.tax_rate}
                    onChange={e => updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-11 md:col-span-1 flex items-center justify-end">
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Discount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-28 px-2 py-1 border border-slate-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Payment terms, additional information..."
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Link to="/invoices">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" loading={saving}>
            <Save size={16} /> {isEdit ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
