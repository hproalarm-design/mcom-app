import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuotation } from '../api/client';
import type { Quotation } from '../types';

const COMPANY = {
  name: 'Mcom Company',
  address: '[Address Here]',
  phone: '[Phone Here]',
  email: '[Email Here]',
  website: '[Website Here]',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  sent: '#2563eb',
  accepted: '#16a34a',
  rejected: '#dc2626',
  expired: '#9ca3af',
};

export default function QuotationPrint() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getQuotation(parseInt(id))
      .then(setQuotation)
      .catch(() => setError('Failed to load quotation'));
  }, [id]);

  useEffect(() => {
    if (quotation) {
      setTimeout(() => window.print(), 500);
    }
  }, [quotation]);

  if (error) {
    return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
  }

  if (!quotation) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[quotation.status] || '#6b7280';

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { margin: 15mm; size: A4; }
        }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; }
      `}</style>

      {/* Print button (hidden when printing) */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          🖨 Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}
        >
          Close
        </button>
      </div>

      {/* Quotation Document */}
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '40px', background: '#fff', boxShadow: '0 1px 20px rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {COMPANY.name}
            </h1>
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
              <div>{COMPANY.address}</div>
              <div>{COMPANY.phone}</div>
              <div>{COMPANY.email}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>QUOTATION</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>{quotation.quotation_number}</div>
            <div style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '3px 12px',
              borderRadius: 20,
              background: statusColor + '20',
              color: statusColor,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {quotation.status}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '2px solid #e2e8f0', marginBottom: 32 }} />

        {/* Bill To + Dates */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
              Prepared For
            </div>
            {quotation.customer_name ? (
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{quotation.customer_name}</div>
                {quotation.customer_address && <div style={{ color: '#475569' }}>{quotation.customer_address}</div>}
                {quotation.customer_city && <div style={{ color: '#475569' }}>{quotation.customer_city}{quotation.customer_country ? `, ${quotation.customer_country}` : ''}</div>}
                {quotation.customer_phone && <div style={{ color: '#475569' }}>Tel: {quotation.customer_phone}</div>}
                {quotation.customer_email && <div style={{ color: '#475569' }}>{quotation.customer_email}</div>}
                {quotation.customer_tax_number && <div style={{ color: '#475569' }}>Tax No: {quotation.customer_tax_number}</div>}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No customer assigned</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Issue Date</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{formatDate(quotation.issue_date)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Valid Until</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{formatDate(quotation.validity_date)}</div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>
                Description
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', width: 70 }}>
                Qty
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', width: 110 }}>
                Unit Price
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', width: 60 }}>
                SST%
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', width: 110 }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {quotation.items?.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 12px', fontSize: 13, color: '#1e293b' }}>
                  {item.description}
                  {item.unit && <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>({item.unit})</span>}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: 13, color: '#475569' }}>{item.quantity}</td>
                <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13, color: '#475569' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13, color: '#475569' }}>{item.tax_rate}%</td>
                <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
          <div style={{ width: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#475569' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#475569' }}>
              <span>SST</span>
              <span>{formatCurrency(quotation.tax_amount)}</span>
            </div>
            {quotation.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#dc2626' }}>
                <span>Discount</span>
                <span>-{formatCurrency(quotation.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16, fontWeight: 800, color: '#0f172a', borderTop: '2px solid #e2e8f0', marginTop: 4 }}>
              <span>Total</span>
              <span>{formatCurrency(quotation.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quotation.notes && (
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{quotation.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          This quotation is valid until {formatDate(quotation.validity_date)} · {COMPANY.name} · {COMPANY.email}
        </div>
      </div>
    </>
  );
}
