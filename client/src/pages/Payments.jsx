import React, { useState, useEffect, useCallback } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { sendPaymentReminder } from '../utils/whatsapp';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const [modeFilter, setModeFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Record Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        api.getPayments({ mode: modeFilter }),
        api.getCustomers()
      ]);
      setPayments(pRes.payments || []);
      setPendingCustomers(pRes.pendingCustomers || []);
      setCustomers(cRes.customers || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [modeFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleOpenRecordPay = (customerId = '') => {
    setSelectedCustomerId(customerId ? String(customerId) : '');
    const found = pendingCustomers.find(c => String(c.customer_id) === String(customerId));
    setPayAmount(found ? String(found.totalPending) : '');
    setPayNotes('');
    setPayMode('Cash');
    setShowPayModal(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !payAmount) {
      alert('Please select customer and enter amount');
      return;
    }

    try {
      setSaving(true);
      await api.recordPayment({
        customer_id: selectedCustomerId,
        amount: parseFloat(payAmount),
        payment_mode: payMode,
        notes: payNotes
      });
      alert('Payment recorded successfully!');
      setShowPayModal(false);
      loadPayments();
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPendingAll = pendingCustomers.reduce((acc, c) => acc + (c.totalPending || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            Payment & Account Receivables
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Track cash collections, UPI transfers, outstanding balances, and send automated reminders
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handleOpenRecordPay()} className="btn btn-primary">
            <Plus size={18} />
            <span>Record Payment</span>
          </button>

          <button onClick={loadPayments} className="btn btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #f43f5e' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Outstanding Receivables
          </div>
          <div className="stat-value" style={{ color: '#e11d48', marginTop: '6px' }}>
            ₹{totalPendingAll.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Across {pendingCustomers.length} pending customer accounts
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Payments Recorded
          </div>
          <div className="stat-value" style={{ color: '#059669', marginTop: '6px' }}>
            ₹{totalCollected.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {payments.length} transactions completed
          </div>
        </div>
      </div>

      {/* Prompt #12: Pending Payments & Send WhatsApp Reminder Section */}
      <div className="ocean-card" style={{ border: '2px solid #fecdd3', background: '#fff1f2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#e11d48" />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#9f1239' }}>
              Pending Payments Attention ({pendingCustomers.length} Clients)
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: '#be123c', fontWeight: '600' }}>
            1-Click WhatsApp payment reminders with UPI details
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {pendingCustomers.map(c => (
            <div 
              key={c.customer_id}
              style={{
                background: 'white',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.05)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                    {c.business_name || c.customer_name}
                  </strong>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#e11d48' }}>
                    ₹{c.totalPending.toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  📞 {c.phone}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button
                  onClick={() => sendPaymentReminder(c, c.totalPending)}
                  className="btn btn-whatsapp"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '12px', background: '#d97706' }}
                  title="Send professional WhatsApp payment reminder"
                >
                  <Send size={13} />
                  <span>Send Reminder</span>
                </button>

                <button
                  onClick={() => handleOpenRecordPay(c.customer_id)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '12px', background: '#059669' }}
                >
                  <CheckCircle2 size={13} />
                  <span>Collect Pay</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Payment History Log */}
      <div className="ocean-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            Payment Transactions Log ({payments.length})
          </h3>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['All', 'Cash', 'UPI', 'Bank Transfer'].map(m => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: modeFilter === m ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: modeFilter === m ? '#e0f2fe' : 'white',
                  color: modeFilter === m ? '#0369a1' : '#64748b'
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="ocean-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Order Ref</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: '700' }}>{p.business_name || p.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {p.customer_phone}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#0369a1' }}>
                      {p.order_number || 'Water Supply Entry'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '800', color: '#059669', fontSize: '15px' }}>
                      ₹{p.amount?.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-new" style={{ background: '#f1f5f9', color: '#334155' }}>
                      {p.payment_mode}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(p.payment_date || p.created_at).toLocaleDateString()} {new Date(p.payment_date || p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span className="badge badge-paid">
                      {p.status || 'Completed'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{p.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Record Customer Payment
              </h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Customer *:
                </label>
                <select
                  required
                  className="form-select"
                  value={selectedCustomerId}
                  onChange={e => {
                    setSelectedCustomerId(e.target.value);
                    const found = pendingCustomers.find(c => String(c.customer_id) === e.target.value);
                    if (found) setPayAmount(String(found.totalPending));
                  }}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.business_name ? `${c.business_name} (${c.name})` : c.name} - 📞 {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Amount Received (₹) *:
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  min="1"
                  className="form-input"
                  style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Payment Mode:
                </label>
                <select
                  className="form-select"
                  value={payMode}
                  onChange={e => setPayMode(e.target.value)}
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Reference / Transaction Note:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. UPI Ref #49281982 or Cash collected by driver"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPayModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ background: '#059669' }}>
                  <CheckCircle2 size={16} />
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
