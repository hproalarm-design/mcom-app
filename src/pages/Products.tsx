import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../api/client';
import type { Product, Category } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';

const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'box', 'pack', 'ream', 'license', 'kit', 'set'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);
}

const emptyForm = {
  sku: '', name: '', description: '', category_id: '', cost_price: '0',
  sale_price: '', unit: 'pcs', tax_rate: '6', min_stock: '0',
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      category_id: p.category_id ? String(p.category_id) : '',
      cost_price: String(p.cost_price),
      sale_price: String(p.sale_price),
      unit: p.unit,
      tax_rate: String(p.tax_rate),
      min_stock: String(p.min_stock),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      sku: form.sku,
      name: form.name,
      description: form.description || undefined,
      category_id: form.category_id ? parseInt(form.category_id) : undefined,
      cost_price: parseFloat(form.cost_price) || 0,
      sale_price: parseFloat(form.sale_price),
      unit: form.unit,
      tax_rate: parseFloat(form.tax_rate) || 0,
      min_stock: parseInt(form.min_stock) || 0,
    };
    try {
      if (editing) {
        const updated = await updateProduct(editing.id, data);
        setProducts(ps => ps.map(p => p.id === updated.id ? updated : p));
        toast.success('Product updated');
      } else {
        const created = await createProduct(data);
        setProducts(ps => [...ps, created]);
        toast.success('Product created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      setProducts(ps => ps.filter(p => p.id !== id));
      toast.success('Product deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setDeleteId(null);
    }
  };

  const exportExcel = () => {
    const rows = products.map(p => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.category_name || '',
      'Cost Price': p.cost_price,
      'Sale Price': p.sale_price,
      'Tax Rate (%)': p.tax_rate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products.xlsx');
  };

  const stockBadge = (qty: number, min: number) => {
    if (qty === 0) return <Badge variant="danger">Out of stock</Badge>;
    if (qty <= min) return <Badge variant="warning">Low stock</Badge>;
    return <Badge variant="success">In stock</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm mt-1">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <Download size={16} /> Export Excel
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> New Product
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{search ? 'No products match your search' : 'No products yet'}</p>
          {!search && (
            <Button onClick={openCreate} className="mt-4">
              <Plus size={16} /> New Product
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.description && <div className="text-xs text-slate-400 truncate max-w-[180px]">{p.description}</div>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{p.sku}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{p.category_name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-500">{formatCurrency(p.cost_price)}</td>
                    <td className="px-5 py-3 text-sm text-right font-semibold text-slate-900">{formatCurrency(p.sale_price)}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-700">
                      {p.stock_quantity ?? 0} {p.unit}
                    </td>
                    <td className="px-5 py-3">{stockBadge(p.stock_quantity ?? 0, p.min_stock)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'New Product'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" required value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. PROD-001" />
            <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select category"
            />
            <Select
              label="Unit"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              options={UNITS.map(u => ({ value: u, label: u }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost Price" type="number" step="0.01" min="0" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
            <Input label="Sale Price" required type="number" step="0.01" min="0" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="SST (%)" type="number" step="0.1" min="0" max="100" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
            <Input label="Min Stock" type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Product" size="sm">
        <p className="text-slate-600 text-sm">Are you sure you want to delete this product? This action cannot be undone.</p>
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
