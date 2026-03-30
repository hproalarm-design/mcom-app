import { useEffect, useState, useRef } from 'react';
import { Warehouse, ArrowDownCircle, ArrowUpCircle, RotateCcw, History, AlertTriangle, Download, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { getStock, getStockMovements, recordStockMovement } from '../api/client';
import type { StockLevel, StockMovement } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';

type Tab = 'levels' | 'movements';

export default function Stock() {
  const [tab, setTab] = useState<Tab>('levels');
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockLevel | null>(null);
  const [movForm, setMovForm] = useState({ product_id: '', type: 'in', quantity: '', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [movPage, setMovPage] = useState(0);

  // Barcode scanner state
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Quick stock modal (from barcode scan)
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState<StockLevel | null>(null);
  const [quickForm, setQuickForm] = useState({ type: 'in', quantity: '' });
  const [quickSaving, setQuickSaving] = useState(false);

  const PAGE_SIZE = 20;

  const loadStock = async () => {
    try {
      const data = await getStock();
      setStock(data);
    } catch {
      toast.error('Failed to load stock levels');
    }
  };

  const loadMovements = async (page = 0) => {
    try {
      const data = await getStockMovements({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setMovements(data.movements);
      setTotalMovements(data.total);
    } catch {
      toast.error('Failed to load movements');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStock(), loadMovements(0)]).finally(() => setLoading(false));
  }, []);

  // Auto-focus barcode input when on levels tab
  useEffect(() => {
    if (tab === 'levels' && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [tab]);

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const sku = barcodeInput.trim();
    if (!sku) return;
    setBarcodeInput('');
    const found = stock.find(s => s.sku.toLowerCase() === sku.toLowerCase());
    if (!found) {
      toast.error(`Product not found: ${sku}`);
      return;
    }
    setQuickProduct(found);
    setQuickForm({ type: 'in', quantity: '' });
    setQuickModalOpen(true);
  };

  const handleQuickMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProduct || !quickForm.quantity) return;
    setQuickSaving(true);
    try {
      await recordStockMovement({
        product_id: quickProduct.product_id,
        type: quickForm.type,
        quantity: parseFloat(quickForm.quantity),
      });
      toast.success('Stock updated');
      setQuickModalOpen(false);
      await Promise.all([loadStock(), loadMovements(movPage)]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setQuickSaving(false);
      // Re-focus barcode input after modal closes
      setTimeout(() => barcodeRef.current?.focus(), 100);
    }
  };

  const openMovement = (item?: StockLevel) => {
    setSelectedProduct(item || null);
    setMovForm({
      product_id: item ? String(item.product_id) : '',
      type: 'in',
      quantity: '',
      reference: '',
      notes: '',
    });
    setMovModalOpen(true);
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movForm.product_id || !movForm.quantity) return;
    setSaving(true);
    try {
      await recordStockMovement({
        product_id: parseInt(movForm.product_id),
        type: movForm.type,
        quantity: parseFloat(movForm.quantity),
        reference: movForm.reference || undefined,
        notes: movForm.notes || undefined,
      });
      toast.success('Stock movement recorded');
      setMovModalOpen(false);
      await Promise.all([loadStock(), loadMovements(movPage)]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record movement');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const rows = stock.map(s => ({
      SKU: s.sku,
      'Product Name': s.product_name,
      Category: s.category_name || '',
      Quantity: s.quantity,
      Unit: s.unit,
      'Min Stock': s.min_stock,
      Status: s.quantity === 0 ? 'Out of stock' : s.quantity <= s.min_stock ? 'Low' : 'OK',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, 'stock-levels.xlsx');
  };

  const movTypeIcon = (type: string) => {
    if (type === 'in') return <ArrowDownCircle size={16} className="text-green-600" />;
    if (type === 'out') return <ArrowUpCircle size={16} className="text-red-600" />;
    return <RotateCcw size={16} className="text-blue-600" />;
  };

  const movTypeBadge = (type: string) => {
    if (type === 'in') return <Badge variant="success">Stock In</Badge>;
    if (type === 'out') return <Badge variant="danger">Stock Out</Badge>;
    return <Badge variant="info">Adjustment</Badge>;
  };

  const lowStockItems = stock.filter(s => s.quantity <= s.min_stock);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Management</h1>
          <p className="text-slate-500 text-sm mt-1">{stock.length} products tracked</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <Download size={16} /> Export Excel
          </Button>
          <Button onClick={() => openMovement()}>
            <ArrowDownCircle size={16} /> Record Movement
          </Button>
        </div>
      </div>

      {/* Barcode Scanner Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <ScanLine size={20} className="text-blue-500 flex-shrink-0" />
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Scan Barcode / SKU</label>
          <input
            ref={barcodeRef}
            type="text"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeScan}
            placeholder="Scan or type SKU and press Enter..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 text-sm">{lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''} with low stock</p>
            <p className="text-amber-700 text-xs mt-0.5">{lowStockItems.map(i => i.product_name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab('levels')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'levels' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Warehouse size={16} /> Stock Levels
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'movements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <History size={16} /> Movement History
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tab === 'levels' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Stock</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stock.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{item.product_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{item.sku}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{item.category_name || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-semibold ${item.quantity === 0 ? 'text-red-600' : item.quantity <= item.min_stock ? 'text-amber-600' : 'text-slate-900'}`}>
                        {item.quantity}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-slate-500">{item.min_stock}</td>
                    <td className="px-5 py-3">
                      {item.quantity === 0 ? <Badge variant="danger">Out of stock</Badge>
                        : item.quantity <= item.min_stock ? <Badge variant="warning">Low stock</Badge>
                        : <Badge variant="success">OK</Badge>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400">{format(new Date(item.updated_at), 'MMM d, HH:mm')}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => openMovement(item)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No movements recorded</td>
                  </tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-500">{format(new Date(m.created_at), 'MMM d, yyyy HH:mm')}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 text-sm">{m.product_name}</p>
                      <p className="text-xs text-slate-400">{m.sku}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {movTypeIcon(m.type)}
                        {movTypeBadge(m.type)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {m.type === 'out' ? '-' : '+'}{m.quantity} {m.unit}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{m.reference || '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalMovements > PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">Showing {movPage * PAGE_SIZE + 1}–{Math.min((movPage + 1) * PAGE_SIZE, totalMovements)} of {totalMovements}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={movPage === 0} onClick={() => { setMovPage(p => p - 1); loadMovements(movPage - 1); }}>Previous</Button>
                <Button size="sm" variant="outline" disabled={(movPage + 1) * PAGE_SIZE >= totalMovements} onClick={() => { setMovPage(p => p + 1); loadMovements(movPage + 1); }}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stock Modal (from barcode scan) */}
      <Modal open={quickModalOpen} onClose={() => { setQuickModalOpen(false); setTimeout(() => barcodeRef.current?.focus(), 100); }} title="Quick Stock Adjustment">
        {quickProduct && (
          <form onSubmit={handleQuickMovement} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="font-semibold text-slate-900">{quickProduct.product_name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{quickProduct.sku}</p>
              <p className="text-sm text-slate-600 mt-1">Current stock: <span className="font-semibold">{quickProduct.quantity} {quickProduct.unit}</span></p>
            </div>
            <Select
              label="Movement Type"
              required
              value={quickForm.type}
              onChange={e => setQuickForm(f => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'in', label: 'Stock In (Add to stock)' },
                { value: 'out', label: 'Stock Out (Remove from stock)' },
                { value: 'adjustment', label: 'Adjustment (Set new quantity)' },
              ]}
            />
            <Input
              label={quickForm.type === 'adjustment' ? 'New Quantity' : 'Quantity'}
              required
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={quickForm.quantity}
              onChange={e => setQuickForm(f => ({ ...f, quantity: e.target.value }))}
              placeholder="Enter quantity"
            />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setQuickModalOpen(false); setTimeout(() => barcodeRef.current?.focus(), 100); }} className="flex-1">Cancel</Button>
              <Button type="submit" loading={quickSaving} className="flex-1">Save</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Movement Modal */}
      <Modal open={movModalOpen} onClose={() => setMovModalOpen(false)} title="Record Stock Movement">
        <form onSubmit={handleMovement} className="space-y-4">
          <Select
            label="Product"
            required
            value={movForm.product_id}
            onChange={e => setMovForm(f => ({ ...f, product_id: e.target.value }))}
            options={stock.map(s => ({ value: s.product_id, label: `${s.product_name} (${s.sku}) — ${s.quantity} ${s.unit}` }))}
            placeholder="Select product"
          />
          <Select
            label="Movement Type"
            required
            value={movForm.type}
            onChange={e => setMovForm(f => ({ ...f, type: e.target.value }))}
            options={[
              { value: 'in', label: 'Stock In (Add to stock)' },
              { value: 'out', label: 'Stock Out (Remove from stock)' },
              { value: 'adjustment', label: 'Adjustment (Set new quantity)' },
            ]}
          />
          <Input
            label={movForm.type === 'adjustment' ? 'New Quantity' : 'Quantity'}
            required
            type="number"
            step="0.01"
            min="0"
            value={movForm.quantity}
            onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))}
            placeholder="Enter quantity"
          />
          <Input
            label="Reference"
            value={movForm.reference}
            onChange={e => setMovForm(f => ({ ...f, reference: e.target.value }))}
            placeholder="e.g. PO-2026-001"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={movForm.notes}
              onChange={e => setMovForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setMovModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Record Movement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
