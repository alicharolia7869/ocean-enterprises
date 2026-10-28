import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Download, 
  CheckCircle2, 
  Send, 
  X,
  PlusCircle,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { exportToCSV } from '../utils/export';
import { sendOrderConfirmation } from '../utils/whatsapp';

export default function Orders({ openNewOrderModal, onCloseNewOrderModal }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [, setLoading] = useState(true);

  // Filters
  const [timeFilter, setTimeFilter] = useState('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orderCustomer, setOrderCustomer] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1, price: 0 }
  ]);
  const [orderInstructions, setOrderInstructions] = useState('');
  const [orderInitialPaid, setOrderInitialPaid] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [oRes, cRes, pRes] = await Promise.all([
        api.getOrders({
          filter: timeFilter,
          customerId: selectedCustomerId,
          deliveryStatus: deliveryFilter,
          paymentStatus: paymentFilter
        }),
        api.getCustomers(),
        api.getProducts()
      ]);
      setOrders(oRes.orders || []);
      setCustomers(cRes.customers || []);
      setProducts(pRes.products || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, selectedCustomerId, deliveryFilter, paymentFilter]);

  useEffect(() => {
    if (openNewOrderModal) {
      setShowCreateModal(true);
    }
  }, [openNewOrderModal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItemRow = (idx) => {
    if (orderItems.length <= 1) return;
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const next = [...orderItems];
    next[idx][field] = val;

    if (field === 'product_id') {
      const prod = products.find(p => String(p.id) === String(val));
      if (prod) {
        next[idx].price = prod.selling_price;
      }
    }

    setOrderItems(next);
  };

  const calculateOrderTotal = () => {
    return orderItems.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.price || 0)), 0);
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderCustomer) {
      alert('Please select a customer.');
      return;
    }

    const validItems = orderItems.filter(it => it.product_id && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid product.');
      return;
    }

    try {
      setCreating(true);
      const custObj = customers.find(c => String(c.id) === String(orderCustomer));
      await api.createOrder({
        customer_id: orderCustomer,
        items: validItems,
        delivery_address: custObj?.address || '',
        special_instructions: orderInstructions,
        paid_amount: orderInitialPaid ? parseFloat(orderInitialPaid) : 0,
        source: 'Manual'
      });

      alert('Order created successfully!');
      setShowCreateModal(false);
      onCloseNewOrderModal?.();
      setOrderItems([{ product_id: '', quantity: 1, price: 0 }]);
      setOrderInstructions('');
      setOrderInitialPaid('');
      loadData();
    } catch (err) {
      alert('Error creating order: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleExportCSV = () => {
    const rows = orders.map(o => ({
      OrderID: o.order_number,
      Customer: o.business_name || o.customer_name,
      Phone: o.customer_phone,
      TotalAmount: o.total_amount,
      PaymentStatus: o.payment_status,
      DeliveryStatus: o.delivery_status,
      Date: o.order_date,
      Items: o.items?.map(it => `${it.quantity}x ${it.product_name}`).join('; ')
    }));
    exportToCSV(`Ocean_Enterprises_Orders_${timeFilter}`, rows);
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.order_number && o.order_number.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.business_name && o.business_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.includes(q)) ||
      o.items?.some(it => it.product_name && it.product_name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            Order History & Management
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Search, filter, and inspect detailed distribution records
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>+ Create New Order</span>
          </button>
        </div>
      </div>

      {/* Deep Filter Bar */}
      <div className="ocean-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Row 1: Time Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginRight: '4px' }}>Time Range:</span>
            {['Today', 'Yesterday', 'This Week', 'This Month', 'All'].map(t => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: timeFilter === t ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  background: timeFilter === t ? '#eff6ff' : '#ffffff',
                  color: timeFilter === t ? '#0284c7' : '#64748b',
                  transition: 'all 0.12s ease'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Row 2: Dropdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>
              <input
                type="text"
                placeholder="Search orders, clients, items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ height: '38px', fontSize: '13px' }}
              />
            </div>

            <div>
              <select
                className="form-select"
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                style={{ height: '38px', fontSize: '13px' }}
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.business_name || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="form-select"
                value={deliveryFilter}
                onChange={e => setDeliveryFilter(e.target.value)}
                style={{ height: '38px', fontSize: '13px' }}
              >
                <option value="All">All Delivery Statuses</option>
                <option value="New Order">New Order</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <select
                className="form-select"
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                style={{ height: '38px', fontSize: '13px' }}
              >
                <option value="All">All Payment Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="ocean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ocean-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Products Ordered</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th>Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No orders match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <strong style={{ color: '#0369a1', fontSize: '13px' }}>{o.order_number}</strong>
                      {o.source === 'WhatsApp' && (
                        <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '800' }}>WhatsApp</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{o.business_name || o.customer_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {o.customer_phone}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {o.items?.map(it => (
                          <span key={it.id} style={{ fontSize: '12px', color: '#334155' }}>
                            <strong>{it.quantity}x</strong> {it.product_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#059669' }}>
                        ₹{o.total_amount}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${o.payment_status.toLowerCase()}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${o.delivery_status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {o.delivery_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(o.order_date || o.created_at).toLocaleDateString()} {new Date(o.order_date || o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => sendOrderConfirmation(o, o)}
                          style={{ padding: '6px', background: '#25d366', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          title="Resend WhatsApp Confirmation"
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Order Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); onCloseNewOrderModal?.(); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Create New Direct Order
              </h3>
              <button onClick={() => { setShowCreateModal(false); onCloseNewOrderModal?.(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Select Customer *:
                </label>
                <select
                  required
                  className="form-select"
                  value={orderCustomer}
                  onChange={e => setOrderCustomer(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.business_name ? `${c.business_name} (${c.name})` : c.name} - 📞 {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Items Rows */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                    Order Items & Products:
                  </label>
                  <button 
                    type="button" 
                    onClick={handleAddItemRow}
                    style={{ background: 'transparent', border: 'none', color: '#0284c7', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <PlusCircle size={14} />
                    <span>+ Add Product</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orderItems.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        required
                        className="form-select"
                        style={{ flex: 2 }}
                        value={row.product_id}
                        onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.size}) - ₹{p.selling_price}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        required
                        className="form-input"
                        style={{ width: '80px', textAlign: 'center' }}
                        value={row.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        placeholder="Qty"
                      />

                      <div style={{ width: '80px', fontWeight: '700', fontSize: '14px', textAlign: 'right' }}>
                        ₹{Number(row.quantity || 0) * Number(row.price || 0)}
                      </div>

                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions & Advance Payment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Delivery Instructions:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={orderInstructions}
                    onChange={e => setOrderInstructions(e.target.value)}
                    placeholder="e.g. deliver chilled at 2 PM"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Advance Paid Amount (₹):
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={orderInitialPaid}
                    onChange={e => setOrderInitialPaid(e.target.value)}
                    placeholder="0 if pending"
                  />
                </div>
              </div>

              {/* Order Total & Submit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Estimated Total:</span>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0369a1' }}>
                    ₹{calculateOrderTotal()}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Create Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
