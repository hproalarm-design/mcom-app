import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Stock from './pages/Stock';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoicePrint from './pages/InvoicePrint';
import Customers from './pages/Customers';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationPrint from './pages/QuotationPrint';
import Backup from './pages/Backup';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px' },
        }}
      />
      <Routes>
        <Route path="/invoices/:id/print" element={<InvoicePrint />} />
        <Route path="/quotations/:id/print" element={<QuotationPrint />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<InvoiceForm />} />
          <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/new" element={<QuotationForm />} />
          <Route path="/quotations/:id/edit" element={<QuotationForm />} />
          <Route path="/backup" element={<Backup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
