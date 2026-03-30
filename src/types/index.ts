export interface Category {
  id: number;
  name: string;
  description: string | null;
  product_count?: number;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name?: string;
  cost_price: number;
  sale_price: number;
  unit: string;
  tax_rate: number;
  min_stock: number;
  stock_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface StockLevel {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  min_stock: number;
  category_name: string | null;
  quantity: number;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  invoice_count?: number;
  total_paid?: number;
  created_at: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number | null;
  product_name?: string;
  unit?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_country?: string;
  customer_tax_number?: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string | null;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuotationItem {
  id?: number;
  quotation_id?: number;
  product_id: number | null;
  product_name?: string;
  unit?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_country?: string;
  customer_tax_number?: string;
  issue_date: string;
  validity_date: string;
  status: QuotationStatus;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string | null;
  items?: QuotationItem[];
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockAlerts: number;
  monthlyRevenue: number;
  unpaidInvoices: number;
  recentInvoices: Invoice[];
  stockAlerts: (StockLevel & { name: string })[];
}
