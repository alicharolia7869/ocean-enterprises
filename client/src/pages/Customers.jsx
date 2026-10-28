import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Navigation as NavIcon, 
  Edit, 
  Trash2, 
  Compass, 
  FileText, 
  Printer, 
  X,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { openWhatsApp } from '../utils/whatsapp';
import { openGoogleMapsPin, captureCurrentLocation } from '../utils/maps';
import { printStatement } from '../utils/export';

export default function Customers({ selectedCustomerIdToOpen }) {
  const [customers, setCustomers] = useState([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomerDetail, setViewingCustomerDetail] = useState(null);
  const [gpsCapturing, setGpsCapturing] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    business_name: '',
    phone: '',
    whatsapp_number: '',
    address: '',
    latitude: '',
    longitude: '',
    customer_type: 'Shop',
    notes: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({ type: typeFilter, search: searchQuery });
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchQuery]);

  const handleOpenDetail = useCallback(async (id) => {
    try {
      const res = await api.getCustomerById(id);
      setViewingCustomerDetail(res);
    } catch (err) {
      alert('Error fetching customer history: ' + err.message);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (selectedCustomerIdToOpen && customers.length > 0) {
      const found = customers.find(c => c.id === Number(selectedCustomerIdToOpen));
      if (found) handleOpenDetail(found.id);
    }
  }, [selectedCustomerIdToOpen, customers, handleOpenDetail]);

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setEditingCustomer(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      business_name: c.business_name || '',
      phone: c.phone || '',
      whatsapp_number: c.whatsapp_number || c.phone || '',
      address: c.address || '',
      latitude: c.latitude ? String(c.latitude) : '',
      longitude: c.longitude ? String(c.longitude) : '',
      customer_type: c.customer_type || 'Shop',
      notes: c.notes || ''
    });
    setShowAddModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, formData);
        alert('Customer details updated successfully!');
      } else {
        await api.createCustomer(formData);
        alert('New customer registered successfully!');
      }
      setShowAddModal(false);
      loadCustomers();
    } catch (err) {
      alert('Error saving customer: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove customer "${name}"?`)) return;
    try {
      await api.deleteCustomer(id);
      loadCustomers();
    } catch (err) {
      alert('Failed to delete customer: ' + err.message);
    }
  };

  const handleGpsCapture = async () => {
    try {
      setGpsCapturing(true);
      const coords = await captureCurrentLocation();
      setFormData(prev => ({
        ...prev,
        latitude: String(coords.latitude.toFixed(6)),
        longitude: String(coords.longitude.toFixed(6))
      }));
      alert(`📍 GPS Coordinates captured: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    } catch (err) {
      alert('Could not capture GPS location: ' + err.message);
    } finally {
      setGpsCapturing(false);
    }
  };

  const handlePrintCustomerStatement = (detail) => {
    const c = detail.customer;
    const monthsHtml = (detail.monthlyStats || []).map(m => `
      <tr>
        <td><strong>${m.month}</strong></td>
        <td>${m.total_water_units} Jars</td>
        <td>${m.total_orders} Orders</td>
        <td>₹${m.total_sales?.toLocaleString()}</td>
        <td style="color: green;">₹${m.total_paid?.toLocaleString()}</td>
        <td style="color: red;">₹${m.total_pending?.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <div style="margin-bottom: 20px;">
        <h3>Customer: ${c.business_name || c.name} (${c.customer_type})</h3>
        <p>Phone: ${c.phone} | Address: ${c.address}</p>
        <p>Overall Total Billed: <strong>₹${c.totalSales?.toLocaleString()}</strong> | Total Paid: <strong>₹${c.totalPaid?.toLocaleString()}</strong> | Outstanding Balance: <strong style="color: red;">₹${c.pendingBalance?.toLocaleString()}</strong></p>
      </div>
      <h4>Monthly Supply & Sales Account</h4>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Water Units</th>
            <th>Orders</th>
            <th>Total Sales</th>
            <th>Paid</th>
            <th>Pending</th>
          </tr>
        </thead>
        <tbody>
          ${monthsHtml}
        </tbody>
      </table>
    `;
    printStatement(`Customer Statement - ${c.business_name || c.name}`, html);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            Customer Management ({customers.length})
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Local shops, restaurants, offices, hotels, and recurring drinking water accounts
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary" style={{ padding: '10px 20px' }}>
          <Plus size={18} />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="ocean-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            <input
              type="text"
              placeholder="Search by customer name, shop name, phone, address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Type Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['All', 'Shop', 'Restaurant', 'Office', 'Hotel', 'Home', 'Other'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: typeFilter === type ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  background: typeFilter === type ? '#eff6ff' : '#ffffff',
                  color: typeFilter === type ? '#0284c7' : '#64748b',
                  transition: 'all 0.12s ease'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {customers.map(customer => (
          <div 
            key={customer.id} 
            className="ocean-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}
          >
            {/* Header: Name and Type badge */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
                    {customer.business_name || customer.name}
                  </h3>
                  {customer.business_name && (
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                      Owner: {customer.name}
                    </div>
                  )}
                </div>
                <span className="badge badge-new" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                  {customer.customer_type}
                </span>
              </div>

              {/* Address */}
              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '10px' }}>
                <MapPin size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{customer.address}</span>
              </div>

              {/* Financial Balance Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', marginTop: '12px', border: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Balance Due</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: customer.balance_pending > 0 ? '#e11d48' : '#16a34a' }}>
                    {customer.balance_pending > 0 ? `₹${customer.balance_pending?.toLocaleString()}` : '✓ All Paid'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Total Orders</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    {customer.total_orders || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {/* 1. Call Customer */}
                <a 
                  href={`tel:${customer.phone}`}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Phone size={14} color="#0284c7" />
                  <span>Call</span>
                </a>

                {/* 2. WhatsApp Customer */}
                <button
                  onClick={() => openWhatsApp(customer.whatsapp_number || customer.phone, `Hello ${customer.name}, greetings from Ocean Enterprises!`)}
                  className="btn btn-whatsapp"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '12px', gap: '4px' }}
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp</span>
                </button>

                {/* 3. Open Location in Google Maps */}
                <button
                  onClick={() => openGoogleMapsPin(customer.latitude, customer.longitude, customer.address)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '12px', gap: '4px' }}
                  title="Open in Google Maps"
                >
                  <NavIcon size={14} color="#ea4335" />
                  <span>Maps</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                {/* View Customer History */}
                <button
                  onClick={() => handleOpenDetail(customer.id)}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', color: '#0369a1', fontWeight: '700', flex: 1 }}
                >
                  <FileText size={14} />
                  <span>View History & Ledger</span>
                </button>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleOpenEdit(customer)} 
                    style={{ padding: '6px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    title="Edit Customer"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCustomer(customer.id, customer.name)} 
                    style={{ padding: '6px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                    title="Delete Customer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Contact Person Name *:
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Business / Shop Name:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.business_name}
                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="e.g. ABC Restaurant"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Phone Number *:
                  </label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    WhatsApp Number:
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.whatsapp_number}
                    onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="Same as phone if blank"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Customer Type:
                  </label>
                  <select
                    className="form-select"
                    value={formData.customer_type}
                    onChange={e => setFormData({ ...formData, customer_type: e.target.value })}
                  >
                    <option value="Shop">Shop / Retail Store</option>
                    <option value="Restaurant">Restaurant / Cafe</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Office">Office / Corporate</option>
                    <option value="Home">Home / Residential</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* GPS Capture Button */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    GPS Location:
                  </label>
                  <button
                    type="button"
                    onClick={handleGpsCapture}
                    disabled={gpsCapturing}
                    className="btn btn-secondary"
                    style={{ width: '100%', height: '44px', color: '#0369a1', borderColor: '#38bdf8' }}
                  >
                    <Compass size={16} />
                    <span>{gpsCapturing ? 'Capturing GPS...' : 'Use Current Location'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Delivery Address *:
                </label>
                <textarea
                  required
                  rows={2}
                  className="form-textarea"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Door No, Building, Landmark, Street name..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Latitude:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.latitude}
                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g. 19.0760"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Longitude:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.longitude}
                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g. 72.8777"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Delivery / Billing Notes:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. 5 jars daily at 10 AM, monthly credit"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} />
                  <span>{editingCustomer ? 'Update Customer' : 'Save Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer History & Monthly Ledger Drawer Modal */}
      {viewingCustomerDetail && (
        <div className="modal-overlay" onClick={() => setViewingCustomerDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  {viewingCustomerDetail.customer.business_name || viewingCustomerDetail.customer.name}
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Account Ledger & Monthly Distribution Records
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handlePrintCustomerStatement(viewingCustomerDetail)}
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Printer size={14} />
                  <span>Print Statement</span>
                </button>
                <button onClick={() => setViewingCustomerDetail(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="#64748b" />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Ledger Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>TOTAL SALES</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    ₹{viewingCustomerDetail.customer.totalSales?.toLocaleString() || 0}
                  </div>
                </div>

                <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: '700' }}>TOTAL PAID</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>
                    ₹{viewingCustomerDetail.customer.totalPaid?.toLocaleString() || 0}
                  </div>
                </div>

                <div style={{ background: '#ffe4e6', padding: '12px', borderRadius: '12px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '11px', color: '#be123c', fontWeight: '700' }}>PENDING DUE</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#e11d48' }}>
                    ₹{viewingCustomerDetail.customer.pendingBalance?.toLocaleString() || 0}
                  </div>
                </div>
              </div>

              {/* Monthly Ledger Table (Prompt #13) */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                  Monthly Supply & Sales Breakdown
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="ocean-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Water Units</th>
                        <th>Orders</th>
                        <th>Sales</th>
                        <th>Paid</th>
                        <th>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingCustomerDetail.monthlyStats?.map(m => (
                        <tr key={m.month}>
                          <td style={{ fontWeight: '700' }}>{m.month}</td>
                          <td>
                            <span style={{ fontWeight: '800', color: '#0284c7' }}>{m.total_water_units} Jars</span>
                          </td>
                          <td>{m.total_orders}</td>
                          <td style={{ fontWeight: '700' }}>₹{m.total_sales?.toLocaleString()}</td>
                          <td style={{ color: '#16a34a', fontWeight: '700' }}>₹{m.total_paid?.toLocaleString()}</td>
                          <td style={{ color: m.total_pending > 0 ? '#e11d48' : '#64748b', fontWeight: '800' }}>
                            ₹{m.total_pending?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Water Entries list */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                  Recent Water Supply Records
                </h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="ocean-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingCustomerDetail.waterEntries?.map(w => (
                        <tr key={w.id}>
                          <td>{w.date}</td>
                          <td style={{ fontWeight: '700' }}>{w.quantity} Jars</td>
                          <td>₹{w.total_amount}</td>
                          <td>
                            <span className={`badge badge-${w.payment_status.toLowerCase()}`}>{w.payment_status}</span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>{w.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
