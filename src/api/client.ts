import type {
  Category,
  Product,
  StockLevel,
  StockMovement,
  Customer,
  Invoice,
  InvoiceStatus,
  DashboardStats,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Dashboard
export const getDashboardStats = () => request<DashboardStats>('/dashboard/stats');

// Categories
export const getCategories = () => request<Category[]>('/categories');
export const createCategory = (data: Partial<Category>) =>
  request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id: number, data: Partial<Category>) =>
  request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id: number) =>
  request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' });

// Products
export const getProducts = () => request<Product[]>('/products');
export const getProduct = (id: number) => request<Product>(`/products/${id}`);
export const createProduct = (data: Partial<Product>) =>
  request<Product>('/products', { method: 'POST', body: JSON.stringify(data) });
export const updateProduct = (id: number, data: Partial<Product>) =>
  request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProduct = (id: number) =>
  request<{ message: string }>(`/products/${id}`, { method: 'DELETE' });

// Stock
export const getStock = () => request<StockLevel[]>('/stock');
export const getStockMovements = (params?: { limit?: number; offset?: number; product_id?: number }) => {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : '';
  return request<{ movements: StockMovement[]; total: number }>(`/stock/movements${qs}`);
};
export const recordStockMovement = (data: { product_id: number; type: string; quantity: number; reference?: string; notes?: string }) =>
  request<{ message: string; new_quantity: number }>('/stock/movement', { method: 'POST', body: JSON.stringify(data) });
export const adjustStock = (productId: number, data: { quantity: number; notes?: string }) =>
  request<{ message: string; new_quantity: number }>(`/stock/adjust/${productId}`, { method: 'PUT', body: JSON.stringify(data) });

// Customers
export const getCustomers = () => request<Customer[]>('/customers');
export const createCustomer = (data: Partial<Customer>) =>
  request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) });
export const updateCustomer = (id: number, data: Partial<Customer>) =>
  request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCustomer = (id: number) =>
  request<{ message: string }>(`/customers/${id}`, { method: 'DELETE' });

// Invoices
export const getInvoices = () => request<Invoice[]>('/invoices');
export const getInvoice = (id: number) => request<Invoice>(`/invoices/${id}`);
export const createInvoice = (data: Partial<Invoice>) =>
  request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) });
export const updateInvoice = (id: number, data: Partial<Invoice>) =>
  request<Invoice>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteInvoice = (id: number) =>
  request<{ message: string }>(`/invoices/${id}`, { method: 'DELETE' });
export const updateInvoiceStatus = (id: number, status: InvoiceStatus) =>
  request<Invoice>(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
