import { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Package, Users, FileText, ClipboardList, Warehouse, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportBackup, importBackup } from '../api/client';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

interface BackupCounts {
  categories: number;
  products: number;
  customers: number;
  stock_levels: number;
  stock_movements: number;
  invoices: number;
  quotations: number;
}

interface BackupData {
  version: number;
  app: string;
  exported_at: string;
  [key: string]: unknown;
}

export default function Backup() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importData, setImportData] = useState<BackupData | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastImportCounts, setLastImportCounts] = useState<BackupCounts | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mcom-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed || parsed.app !== 'mcom-app' || parsed.version !== 1) {
          toast.error('Invalid backup file: unrecognised format or version.');
          return;
        }
        setImportData(parsed as BackupData);
        setImportConfirmOpen(true);
      } catch {
        toast.error('Failed to parse backup file. Make sure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      const result = await importBackup(importData as unknown as Record<string, unknown>);
      setLastImportCounts(result.counts as unknown as BackupCounts);
      setImportConfirmOpen(false);
      setImportData(null);
      setSuccessOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const previewCounts = importData ? {
    categories: (importData.categories as unknown[])?.length ?? 0,
    products: (importData.products as unknown[])?.length ?? 0,
    customers: (importData.customers as unknown[])?.length ?? 0,
    stock_levels: (importData.stock_levels as unknown[])?.length ?? 0,
    stock_movements: (importData.stock_movements as unknown[])?.length ?? 0,
    invoices: (importData.invoices as unknown[])?.length ?? 0,
    quotations: (importData.quotations as unknown[])?.length ?? 0,
  } : null;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Backup &amp; Restore</h1>
        <p className="text-slate-500 text-sm mt-1">Export your data for safekeeping or restore from a previous backup.</p>
      </div>

      {/* Export card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Download size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Export Full Backup</p>
            <p className="text-xs text-slate-500">Download all data as a single JSON file</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: Package, label: 'Products & Categories', color: 'text-violet-600 bg-violet-50' },
              { icon: Users, label: 'Customers', color: 'text-blue-600 bg-blue-50' },
              { icon: Warehouse, label: 'Stock Levels & Movements', color: 'text-green-600 bg-green-50' },
              { icon: FileText, label: 'Invoices', color: 'text-orange-600 bg-orange-50' },
              { icon: ClipboardList, label: 'Quotations', color: 'text-purple-600 bg-purple-50' },
              { icon: Database, label: 'All line items included', color: 'text-slate-600 bg-slate-50' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color.split(' ')[1]}`}>
                <Icon size={14} className={color.split(' ')[0]} />
                <span className="text-xs font-medium text-slate-700">{label}</span>
              </div>
            ))}
          </div>
          <Button onClick={handleExport} loading={exporting} className="w-full sm:w-auto">
            <Download size={16} /> Download Backup JSON
          </Button>
        </div>
      </div>

      {/* Import card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Upload size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Restore from Backup</p>
            <p className="text-xs text-slate-500">Import a previously exported JSON backup</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Warning: This will overwrite all current data</p>
              <p className="text-xs text-red-700 mt-1">
                Importing a backup will permanently replace all products, customers, invoices, quotations, and stock data with the data from the backup file.
                This action cannot be undone. Export a current backup first if you want to keep your existing data.
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-amber-300 text-amber-700 hover:bg-amber-50">
            <Upload size={16} /> Select Backup File (.json)
          </Button>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      <Modal open={importConfirmOpen} onClose={() => { setImportConfirmOpen(false); setImportData(null); }} title="Confirm Restore" size="sm">
        <div className="space-y-4">
          {importData && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
              <p className="text-xs text-slate-500 mb-2">Backup from: <span className="font-mono text-slate-700">{importData.exported_at ? format(new Date(importData.exported_at), 'dd MMM yyyy, HH:mm') : 'Unknown'}</span></p>
              <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                <span>Products:</span><span className="font-semibold">{previewCounts?.products}</span>
                <span>Categories:</span><span className="font-semibold">{previewCounts?.categories}</span>
                <span>Customers:</span><span className="font-semibold">{previewCounts?.customers}</span>
                <span>Invoices:</span><span className="font-semibold">{previewCounts?.invoices}</span>
                <span>Quotations:</span><span className="font-semibold">{previewCounts?.quotations}</span>
                <span>Stock movements:</span><span className="font-semibold">{previewCounts?.stock_movements}</span>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">All current data will be permanently replaced. This cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setImportConfirmOpen(false); setImportData(null); }} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleImport} loading={importing} className="flex-1">
              Yes, Restore Backup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal open={successOpen} onClose={() => setSuccessOpen(false)} title="Restore Complete" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">Backup restored successfully</p>
              <p className="text-xs text-green-700 mt-0.5">All data has been replaced with the backup.</p>
            </div>
          </div>
          {lastImportCounts && (
            <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600 bg-slate-50 rounded-lg p-4">
              <span>Products imported:</span><span className="font-semibold">{lastImportCounts.products}</span>
              <span>Customers imported:</span><span className="font-semibold">{lastImportCounts.customers}</span>
              <span>Invoices imported:</span><span className="font-semibold">{lastImportCounts.invoices}</span>
              <span>Quotations imported:</span><span className="font-semibold">{lastImportCounts.quotations}</span>
              <span>Stock records:</span><span className="font-semibold">{lastImportCounts.stock_levels}</span>
              <span>Stock movements:</span><span className="font-semibold">{lastImportCounts.stock_movements}</span>
            </div>
          )}
          <p className="text-xs text-slate-500">Refresh any open pages to see the restored data.</p>
          <Button onClick={() => setSuccessOpen(false)} className="w-full">Done</Button>
        </div>
      </Modal>
    </div>
  );
}
