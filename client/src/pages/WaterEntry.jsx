import React, { useState, useEffect, useCallback } from 'react';
import { 
  Droplet, 
  Search, 
  Send, 
  Trash2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { openWhatsApp } from '../utils/whatsapp';

export default function WaterEntry() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [quantity, setQuantity] = useState(2);
  const [pricePerJar, setPricePerJar] = useState(35);
  const [paymentStatus, setPaymentStatus] = useState('Pending'); // 'Paid' | 'Pending'
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Summary and logs
  const [summary, setSummary] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [, setLoading] = useState(true);

  // Success toast
  const [lastSaved, setLastSaved] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cRes, sRes, eRes] = await Promise.all([
        api.getCustomers(),
        api.getWaterSummary(selectedMonth),
        api.getWaterEntries({ date: new Date().toISOString().slice(0, 10) })
      ]);
      setCustomers(cRes.customers || []);
      setSummary(sRes);
      setRecentEntries(eRes.entries || []);
    } catch (err) {
      console.error('Error loading water entries:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickAdd = (inc) => {
    setQuantity(prev => Math.max(1, prev + inc));
  };

  const handleSaveWaterEntry = async (e) => {
    e?.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }
    if (quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.createWaterEntry({
        customer_id: selectedCustomerId,
        quantity,
        price: pricePerJar,
        payment_status: paymentStatus,
        payment_mode: paymentMode,
        notes
      });

      setLastSaved(res.entry);

      // Reset form fields
      setQuantity(2);
      setNotes('');
      setPaymentStatus('Pending');

      // Refresh data
      loadData();
    } catch (err) {
      alert('Failed to save water supply: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this water delivery entry? Inventory will be restored.')) return;
    try {
      await api.deleteWaterEntry(id);
      loadData();
    } catch (err) {
      alert('Error deleting entry: ' + err.message);
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.business_name && c.business_name.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedCustomerId));
  const totalAmount = quantity * pricePerJar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner with Today's Live Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              background: '#eff6ff', 
              color: '#0284c7', 
              padding: '8px', 
              borderRadius: '8px', 
              border: '1px solid #bfdbfe',
              display: 'flex' 
            }}>
              <Droplet size={22} fill="#0284c7" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Rapid Water Supply Entry
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Log daily 20L water jar supply in under 15 seconds with quick-tap counters
              </p>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Today's Water Given</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0284c7' }}>
              {summary?.todayStats?.totalUnits || 0} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Jars</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Today's Revenue</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
              ₹{summary?.todayStats?.totalAmount?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Main Rapid Entry Card */}
      <div className="ocean-card" style={{ border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)' }}>
        <form onSubmit={handleSaveWaterEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: Customer Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155' }}>
                1. SELECT CUSTOMER:
              </label>
              {selectedCustomerObj && (
                <span style={{ 
                  fontSize: '12px',
                  color: selectedCustomerObj.balance_pending > 0 ? '#e11d48' : '#059669', 
                  fontWeight: '600',
                  background: selectedCustomerObj.balance_pending > 0 ? '#fff1f2' : '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${selectedCustomerObj.balance_pending > 0 ? '#fecdd3' : '#a7f3d0'}`
                }}>
                  Balance: ₹{selectedCustomerObj.balance_pending || 0} ({selectedCustomerObj.balance_pending > 0 ? 'Pending' : 'Settled'})
                </span>
              )}
            </div>

            {/* Quick Customer Search input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Filter customer list by name or phone..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <select
              className="form-select"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              style={{ fontSize: '14px', fontWeight: '500', height: '40px' }}
              required
            >
              <option value="">-- Click to choose Customer ({filteredCustomers.length} available) --</option>
              {filteredCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.business_name ? `${c.business_name} - ${c.name}` : c.name} • 📞 {c.phone} ({c.customer_type})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Quantity with Quick Buttons (+1, +2, +5, +10) */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'block' }}>
              2. QUANTITY (20L WATER JARS):
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Manual numeric input */}
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="form-input"
                style={{ width: '85px', fontSize: '18px', fontWeight: '700', textAlign: 'center', height: '38px' }}
              />

              {/* Quick Increment Buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleQuickAdd(1)} className="qty-btn">+1</button>
                <button type="button" onClick={() => handleQuickAdd(2)} className="qty-btn">+2</button>
                <button type="button" onClick={() => handleQuickAdd(5)} className="qty-btn" style={{ background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}>+5</button>
                <button type="button" onClick={() => handleQuickAdd(10)} className="qty-btn" style={{ background: '#0284c7', color: 'white', borderColor: '#0369a1' }}>+10</button>
                <button type="button" onClick={() => setQuantity(1)} className="qty-btn" style={{ fontSize: '12px', padding: '6px 10px' }}>Reset</button>
              </div>

              {/* Rate per Jar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Rate / Jar:</span>
                <input
                  type="number"
                  value={pricePerJar}
                  onChange={e => setPricePerJar(parseFloat(e.target.value) || 35)}
                  className="form-input"
                  style={{ width: '65px', height: '38px', fontWeight: '600', textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Payment Status & Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                Payment Status:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('Paid')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: paymentStatus === 'Paid' ? '1px solid #10b981' : '1px solid #cbd5e1',
                    background: paymentStatus === 'Paid' ? '#ecfdf5' : 'white',
                    color: paymentStatus === 'Paid' ? '#065f46' : '#475569',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✓ Paid Now
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('Pending')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: paymentStatus === 'Pending' ? '1px solid #f43f5e' : '1px solid #cbd5e1',
                    background: paymentStatus === 'Pending' ? '#fff1f2' : 'white',
                    color: paymentStatus === 'Pending' ? '#9f1239' : '#475569',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⏳ Pending Ledger
                </button>
              </div>
            </div>

            {paymentStatus === 'Paid' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Payment Mode:
                </label>
                <select
                  className="form-select"
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  style={{ height: '38px' }}
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                Optional Delivery Notes:
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. morning drop, empty jar collected"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ height: '38px' }}
              />
            </div>
          </div>

          {/* Total Bar & Submit Button */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            background: '#f8fafc', 
            padding: '12px 16px', 
            borderRadius: '10px', 
            border: '1px solid #e2e8f0', 
            flexWrap: 'wrap', 
            gap: '12px' 
          }}>
            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Amount:</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                ₹{totalAmount} <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '400' }}>({quantity} jars @ ₹{pricePerJar})</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !selectedCustomerId}
              className="btn btn-primary"
              style={{ padding: '9px 20px', fontSize: '14px', borderRadius: '8px' }}
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>Save Water Entry</span>
            </button>
          </div>
        </form>

        {/* Success Alert with WhatsApp Slip Button */}
        {lastSaved && (
          <div style={{ 
            marginTop: '14px', 
            background: '#ecfdf5', 
            border: '1px solid #a7f3d0', 
            padding: '12px 16px', 
            borderRadius: '10px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '10px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: '600', fontSize: '13px' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <span>
                Saved! {lastSaved.quantity} jars recorded for {lastSaved.business_name || lastSaved.customer_name} (₹{lastSaved.total_amount}).
              </span>
            </div>

            <button
              onClick={() => {
                const msg = `Hello ${lastSaved.customer_name || lastSaved.business_name},\n\n💧 Today's water supply entry from *Ocean Enterprises*:\n• Quantity: *${lastSaved.quantity} Jars (20L)*\n• Total: *₹${lastSaved.total_amount}*\n• Status: *${lastSaved.payment_status}*\n• Date: ${lastSaved.date}\n\nThank you!`;
                openWhatsApp(lastSaved.customer_phone, msg);
              }}
              className="btn btn-whatsapp"
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              <Send size={13} />
              <span>Send WhatsApp Slip</span>
            </button>
          </div>
        )}
      </div>

      {/* Today's Water Distribution Log */}
      <div className="ocean-card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
          Today's Water Deliveries ({recentEntries.length})
        </h3>

        {recentEntries.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13px', padding: '10px 0' }}>No water entries recorded yet today.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ocean-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Time</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{entry.business_name || entry.customer_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {entry.customer_phone}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: '#0284c7', background: '#eff6ff', padding: '2px 7px', borderRadius: '5px', border: '1px solid #bfdbfe' }}>
                        {entry.quantity} Jars
                      </span>
                    </td>
                    <td>₹{entry.price}</td>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>₹{entry.total_amount}</td>
                    <td>
                      <span className={`badge badge-${entry.payment_status.toLowerCase()}`}>
                        {entry.payment_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{entry.time || '11:00'}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{entry.notes || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteEntry(entry.id)} 
                        style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px', transition: 'color 0.15s ease' }}
                        onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                        title="Delete entry & restore stock"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Monthly Water Summary Table */}
      <div className="ocean-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Customer Monthly Water Summary
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Aggregated monthly consumption and balance statement per client
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="form-input"
              style={{ padding: '5px 10px', fontSize: '12.5px', width: 'auto' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="ocean-table">
            <thead>
              <tr>
                <th>Customer / Business</th>
                <th>Total Water Units</th>
                <th>Delivery Days</th>
                <th>Total Billed</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {summary?.monthlySummary?.map(item => (
                <tr key={item.customer_id}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.business_name || item.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {item.customer_phone}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: '700', color: '#0284c7' }}>
                      {item.total_water_units} Jars
                    </span>
                  </td>
                  <td>{item.delivery_days} days</td>
                  <td style={{ fontWeight: '600' }}>₹{item.total_amount?.toLocaleString()}</td>
                  <td style={{ color: '#059669', fontWeight: '600' }}>₹{item.paid_amount?.toLocaleString()}</td>
                  <td style={{ color: item.pending_amount > 0 ? '#e11d48' : '#64748b', fontWeight: '700' }}>
                    ₹{item.pending_amount?.toLocaleString()}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{item.last_water_date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
