import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuotation } from '../api/client';
import type { Quotation } from '../types';

const COMPANY = {
  name: 'Mcom Company',
  regNo: 'Co. Reg. No.: [REG NO]',
  address: '[No. X, Jalan X, Taman X]',
  postcode: '[Postcode, City, State]',
  phone: 'Tel: [Phone Here]',
  email: '[Email Here]',
  website: '[Website Here]',
};

const PAYMENT_TERMS = [
  'Payment is due within 30 days of invoice date unless otherwise stated.',
  'Prices are in Malaysian Ringgit (RM) and are subject to SST (Sales and Services Tax) at 6% where applicable.',
  'This quotation is valid for the period stated above. Prices may change after expiry.',
  'Delivery charges, if any, will be billed separately unless included in this quotation.',
  'Please quote the quotation number on all correspondence and purchase orders.',
];

function formatRM(n: number) {
  return 'RM ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
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
  const sstLabel = `SST (6%)`;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          @page { margin: 12mm 15mm; size: A4; }
          .page-break { page-break-before: always; }
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #f1f5f9;
          margin: 0;
          padding: 0;
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#1e293b', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <span style={{ color: '#94a3b8', fontSize: 13, flex: 1 }}>Quotation Preview — {quotation.quotation_number}</span>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: '8px 16px', background: '#334155', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >
          Close
        </button>
      </div>

      {/* Document wrapper */}
      <div style={{ paddingTop: 56 }} className="no-print" />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 0 40px' }}>
        <div style={{ background: '#fff', boxShadow: '0 2px 24px rgba(0,0,0,0.10)', borderRadius: 4 }}>

          {/* Blue top bar */}
          <div style={{ background: '#1e3a5f', height: 6, borderRadius: '4px 4px 0 0' }} />

          <div style={{ padding: '36px 48px' }}>

            {/* Header: Company + Quotation Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              {/* Company info */}
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>
                  {COMPANY.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                  <div>{COMPANY.regNo}</div>
                  <div>{COMPANY.address}</div>
                  <div>{COMPANY.postcode}</div>
                  <div>{COMPANY.phone}</div>
                  <div>{COMPANY.email}</div>
                </div>
              </div>

              {/* Quotation title block */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#1e3a5f', letterSpacing: '-1px', textTransform: 'uppercase' }}>
                  Quotation
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                  {quotation.quotation_number}
                </div>
                <div style={{
                  display: 'inline-block',
                  marginTop: 8,
                  padding: '2px 10px',
                  borderRadius: 20,
                  background: statusColor + '18',
                  border: `1px solid ${statusColor}40`,
                  color: statusColor,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}>
                  {quotation.status}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '2px solid #1e3a5f', marginBottom: 28 }} />

            {/* Customer + Dates row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>

              {/* Bill To */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                  Prepared For
                </div>
                {quotation.customer_name ? (
                  <div style={{ fontSize: 13, lineHeight: 1.75 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{quotation.customer_name}</div>
                    {quotation.customer_address && <div style={{ color: '#475569' }}>{quotation.customer_address}</div>}
                    {quotation.customer_city && (
                      <div style={{ color: '#475569' }}>
                        {quotation.customer_city}{quotation.customer_country ? `, ${quotation.customer_country}` : ''}
                      </div>
                    )}
                    {quotation.customer_phone && <div style={{ color: '#475569' }}>Tel: {quotation.customer_phone}</div>}
                    {quotation.customer_email && <div style={{ color: '#475569' }}>{quotation.customer_email}</div>}
                    {quotation.customer_tax_number && (
                      <div style={{ color: '#64748b', fontSize: 12 }}>SST Reg: {quotation.customer_tax_number}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>No customer assigned</div>
                )}
              </div>

              {/* Dates */}
              <div style={{ minWidth: 190 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                  Details
                </div>
                <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#64748b', paddingBottom: 6, paddingRight: 12 }}>Issue Date</td>
                      <td style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{formatDate(quotation.issue_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', paddingBottom: 6, paddingRight: 12 }}>Valid Until</td>
                      <td style={{ fontWeight: 600, color: '#dc2626', textAlign: 'right' }}>{formatDate(quotation.validity_date)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Line items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead>
                <tr style={{ background: '#1e3a5f' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    No.
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', width: 60 }}>
                    Qty
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', width: 120 }}>
                    Unit Price (RM)
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', width: 60 }}>
                    SST%
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', width: 120 }}>
                    Amount (RM)
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotation.items?.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#64748b', verticalAlign: 'top' }}>{i + 1}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#1e293b', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 500 }}>{item.description}</div>
                      {item.unit && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Unit: {item.unit}</div>}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: 13, color: '#475569', verticalAlign: 'top' }}>{item.quantity}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, color: '#475569', verticalAlign: 'top' }}>{formatRM(item.unit_price)}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, color: '#475569', verticalAlign: 'top' }}>{item.tax_rate}%</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#0f172a', verticalAlign: 'top' }}>{formatRM(item.amount)}</td>
                  </tr>
                ))}
                {/* Empty rows if few items */}
                {(quotation.items?.length || 0) < 3 && Array.from({ length: 3 - (quotation.items?.length || 0) }).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td colSpan={6} style={{ padding: '11px 14px', height: 36 }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 36 }}>
              <div style={{ width: 300 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 13, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Subtotal</span>
                  <span>{formatRM(quotation.subtotal)}</span>
                </div>
                {quotation.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 13, color: '#dc2626', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Discount</span>
                    <span>- {formatRM(quotation.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 13, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{sstLabel}</span>
                  <span>{formatRM(quotation.tax_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', fontSize: 16, fontWeight: 800, color: '#fff', background: '#1e3a5f', marginTop: 4, borderRadius: 4 }}>
                  <span>TOTAL</span>
                  <span>{formatRM(quotation.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '12px 16px', marginBottom: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                  Notes / Remarks
                </div>
                <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>{quotation.notes}</div>
              </div>
            )}

            {/* Terms & Conditions */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                Terms &amp; Conditions
              </div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {PAYMENT_TERMS.map((term, i) => (
                  <li key={i} style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, marginBottom: 4 }}>{term}</li>
                ))}
              </ol>
            </div>

            {/* Signature area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
              {['Prepared By', 'Authorised Signature', 'Customer Acceptance'].map((label, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 40 }}>{label}</div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {label === 'Prepared By' ? 'Name / Date' : label === 'Authorised Signature' ? 'Stamp & Signature / Date' : 'Name / Date / Company Stamp'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '2px solid #1e3a5f', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {COMPANY.name} &nbsp;|&nbsp; {COMPANY.phone} &nbsp;|&nbsp; {COMPANY.email}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Valid until {formatDate(quotation.validity_date)} &nbsp;|&nbsp; Page 1 of 1
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
