import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/client';
import type { Customer } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const emptyForm = { name: '', email: '', phone: '', address: '', city: '', country: '', tax_number: '' };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getCustomers()
      .then(setCustomers)
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      city: c.city || '',
      country: c.country || '',
      tax_number: c.tax_number || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateCustomer(editing.id, form);
        setCustomers(cs => cs.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        toast.success('Customer updated');
      } else {
        const created = await createCustomer(form);
        setCustomers(cs => [...cs, { ...created, invoice_count: 0, total_paid: 0 }]);
        toast.success('Customer created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id);
      setCustomers(cs => cs.filter(c => c.id !== id));
      toast.success('Customer deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer');
    } finally {
      setDeleteId(null);
    }
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} customers</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Customer</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No customers yet</p>
          <Button onClick={openCreate} className="mt-4"><Plus size={16} /> New Customer</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600 text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    {c.tax_number && <p className="text-xs text-slate-400">{c.tax_number}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {c.email && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail size={13} className="flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone size={13} className="flex-shrink-0" />
                    {c.phone}
                  </div>
                )}
                {(c.city || c.country) && (
                  <p className="text-slate-400 text-xs">{[c.city, c.country].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{c.invoice_count ?? 0} invoice{(c.invoice_count ?? 0) !== 1 ? 's' : ''}</span>
                <span className="font-medium text-slate-700">{formatCurrency(c.total_paid ?? 0)} paid</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'New Customer'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={f('name')} placeholder="Company or person name" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={f('email')} />
            <Input label="Phone" type="tel" value={form.phone} onChange={f('phone')} />
          </div>
          <Input label="Address" value={form.address} onChange={f('address')} placeholder="Street address" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={f('city')} />
            <Input label="Country" value={form.country} onChange={f('country')} />
          </div>
          <Input label="Tax Number" value={form.tax_number} onChange={f('tax_number')} placeholder="VAT/Tax ID" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Customer" size="sm">
        <p className="text-slate-600 text-sm">Are you sure you want to delete this customer? This action cannot be undone.</p>
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
