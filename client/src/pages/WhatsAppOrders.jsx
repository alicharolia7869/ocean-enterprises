import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Sparkles, 
  CheckCircle, 
  Send, 
  Share2, 
  MapPin, 
  DollarSign, 
  Truck,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { 
  sendOrderConfirmation, 
  sendDeliveryNotification, 
  sendOrderDelivered, 
  sendPaymentReminder, 
  generateOrderCatalogLink,
  DEFAULT_BUSINESS_WHATSAPP
} from '../utils/whatsapp';

export default function WhatsAppOrders() {
  // Parsing input state
  const [rawText, setRawText] = useState('2 water bottles, 3 Thums Up, 2 Appy Fizz');
  const [parsedResult, setParsedResult] = useState(null);
  const [parsing, setParsing] = useState(false);

  // Selected customer for creating order
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Orders queue
  const [whatsappOrders, setWhatsappOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [confirmedOrderBanner, setConfirmedOrderBanner] = useState(null);

  const loadData = async () => {
    try {
      setLoadingOrders(true);
      const [cRes, oRes, sRes] = await Promise.allSettled([
        api.getCustomers(),
        api.getOrders(),
        api.getPublicSettings()
      ]);
      if (cRes.status === 'fulfilled') {
        setCustomers(cRes.value?.customers || []);
      }
      if (oRes.status === 'fulfilled') {
        const wa = (oRes.value?.orders || []).filter(o => o.source === 'WhatsApp' || o.source === 'Manual');
        setWhatsappOrders(wa);
      }
      if (sRes.status === 'fulfilled') {
        setBusinessSettings(sRes.value?.settings || {});
      }
    } catch (err) {
      console.error('Error loading WhatsApp orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleParse = async (textToParse = rawText) => {
    if (!textToParse.trim()) return;
    try {
      setParsing(true);
      const res = await api.parseWhatsAppOrder(textToParse);
      setParsedResult(res);

      // If customer list was empty, try fetching customers now
      if (customers.length === 0) {
        api.getCustomers().then(cRes => {
          if (cRes.customers) setCustomers(cRes.customers);
        }).catch(() => {});
      }

      if (res.matchedCustomer) {
        // Guarantee the matched customer is in the dropdown options
        setCustomers(prev => {
          const exists = prev.some(c => String(c.id) === String(res.matchedCustomer.id));
          return exists ? prev : [res.matchedCustomer, ...prev];
        });
        setSelectedCustomerId(String(res.matchedCustomer.id));
        setCustomerPhone(res.matchedCustomer.phone);
        setCustomerAddress(res.matchedCustomer.address);
      }
    } catch (err) {
      alert('Error parsing message: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleCreateStructuredOrder = async () => {
    if (!selectedCustomerId) {
      alert('Please select or specify a customer');
      return;
    }
    if (!parsedResult?.parsedItems || parsedResult.parsedItems.length === 0) {
      alert('No parsed products to order');
      return;
    }

    try {
      const payload = {
        customer_id: selectedCustomerId,
        items: parsedResult.parsedItems,
        delivery_address: customerAddress,
        special_instructions: specialInstructions,
        source: 'WhatsApp',
        paid_amount: 0
      };

      const res = await api.createOrder(payload);

      // Find the customer details to trigger WhatsApp order confirmation
      const targetCustomer = customers.find(c => String(c.id) === String(selectedCustomerId)) ||
        (parsedResult?.matchedCustomer && String(parsedResult.matchedCustomer.id) === String(selectedCustomerId) ? parsedResult.matchedCustomer : null) ||
        { 
          id: selectedCustomerId, 
          name: 'Customer', 
          business_name: '', 
          phone: customerPhone, 
          whatsapp_number: customerPhone, 
          address: customerAddress 
        };

      const fullOrder = {
        ...res.order,
        items: payload.items,
        total_amount: parsedResult.totalAmount,
        payment_status: 'Pending',
        delivery_status: 'New Order',
        delivery_address: customerAddress,
        customer_name: targetCustomer.name,
        business_name: targetCustomer.business_name,
        customer_phone: targetCustomer.phone || customerPhone,
        customer_whatsapp: targetCustomer.whatsapp_number || targetCustomer.phone || customerPhone
      };

      // 1. Immediately trigger WhatsApp confirmation deep link
      sendOrderConfirmation(targetCustomer, fullOrder);

      // 2. Set banner state with quick re-send action
      setConfirmedOrderBanner({
        orderNumber: res.order.order_number,
        customer: targetCustomer,
        order: fullOrder
      });

      // 3. Prepend into local queue immediately so it renders instantly
      setWhatsappOrders(prev => [fullOrder, ...prev]);

      // 4. Clear parser inputs
      setRawText('');
      setParsedResult(null);
      setSpecialInstructions('');

      // 5. Reload queue in background
      loadData();
    } catch (err) {
      alert('Error saving order: ' + err.message);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await api.updateOrderStatus(orderId, status);
      loadData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleMarkPaid = async (orderId) => {
    try {
      await api.updateOrderPayment(orderId, { markAsFull: true, payment_mode: 'Cash' });
      loadData();
    } catch (err) {
      alert('Failed to mark paid: ' + err.message);
    }
  };

  const samplePresets = [
    "2 water bottles, 3 Thums Up, 2 Appy Fizz",
    "ABC Restaurant 5 jar water, 4 Frooti 600 ml, deliver before 1 PM",
    "Star Bakery 2 x 20L water, 3 Frooti 1.2 L, 2 Thums Up",
    "Ali Grand Hotel 15 water jar, 10 Appy Fizz"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with WhatsApp Direct Link Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#25d366', color: 'white', padding: '6px', borderRadius: '10px', display: 'flex' }}>
              <MessageSquare size={22} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
              WhatsApp Order Processing Engine
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Transform unstructured customer WhatsApp chats into verified structured orders instantly
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a 
            href={generateOrderCatalogLink(businessSettings?.whatsapp || DEFAULT_BUSINESS_WHATSAPP)} 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-whatsapp"
            style={{ textDecoration: 'none' }}
          >
            <Share2 size={16} />
            <span>"Order on WhatsApp" Link</span>
          </a>

          <button onClick={loadData} className="btn btn-secondary">
            <RefreshCw size={14} className={loadingOrders ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Confirmation Success Banner with WhatsApp Trigger */}
      {confirmedOrderBanner && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#10b981', color: 'white', padding: '8px', borderRadius: '50%', display: 'flex' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px', color: '#065f46' }}>
                Order #{confirmedOrderBanner.orderNumber} Created Successfully! 🌊
              </div>
              <div style={{ fontSize: '13px', color: '#047857', marginTop: '2px' }}>
                WhatsApp confirmation was prepared for <strong>{confirmedOrderBanner.customer?.business_name || confirmedOrderBanner.customer?.name}</strong> ({confirmedOrderBanner.customer?.whatsapp_number || confirmedOrderBanner.customer?.phone}).
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => sendOrderConfirmation(confirmedOrderBanner.customer, confirmedOrderBanner.order)}
              className="btn btn-whatsapp"
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700' }}
            >
              <Send size={15} />
              <span>Send WhatsApp Confirmation</span>
            </button>
            <button
              onClick={() => setConfirmedOrderBanner(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontSize: '16px', padding: '6px' }}
              title="Dismiss Banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Parser Box */}
      <div className="ocean-card" style={{ border: '1px solid #a7f3d0', background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#059669" />
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#065f46' }}>
              Natural Language WhatsApp Message Parser
            </span>
          </div>
          <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontWeight: '600', border: '1px solid #a7f3d0' }}>
            Auto Quantity & Product Detection
          </span>
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
          Paste incoming WhatsApp message below (or click a quick sample preset):
        </p>

        {/* Preset quick test pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => { setRawText(preset); handleParse(preset); }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '500',
                color: '#0284c7',
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
            >
              💬 "{preset}"
            </button>
          ))}
        </div>

        {/* Text Input */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <textarea
            rows={3}
            className="form-textarea"
            placeholder="e.g. 2 water bottles, 3 Thums Up, 2 Appy Fizz"
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            style={{ flex: 1, minWidth: '280px', fontSize: '14px' }}
          />
          <button
            onClick={() => handleParse()}
            disabled={parsing || !rawText.trim()}
            className="btn btn-whatsapp"
            style={{ padding: '0 20px', fontSize: '13px' }}
          >
            {parsing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Parse Message</span>
          </button>
        </div>

        {/* Parsed Structure Preview */}
        {parsedResult && (
          <div style={{ marginTop: '20px', background: 'white', padding: '18px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>
                Extracted Structured Order Preview
              </h4>
              <span className="badge badge-confirmed">Confidence: {parsedResult.confidence}</span>
            </div>

            {/* Customer Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                    Assign to Customer:
                  </label>
                  {customers.length === 0 && (
                    <button 
                      type="button" 
                      onClick={async () => {
                        const res = await api.getCustomers().catch(() => ({ customers: [] }));
                        if (res.customers) setCustomers(res.customers);
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#0284c7', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      ↻ Load Customers
                    </button>
                  )}
                </div>
                <select
                  className="form-select"
                  value={selectedCustomerId}
                  onFocus={() => {
                    if (customers.length === 0) {
                      api.getCustomers().then(cRes => {
                        if (cRes.customers) setCustomers(cRes.customers);
                      }).catch(() => {});
                    }
                  }}
                  onChange={e => {
                    setSelectedCustomerId(e.target.value);
                    const found = customers.find(c => String(c.id) === e.target.value) ||
                      (parsedResult?.matchedCustomer && String(parsedResult.matchedCustomer.id) === e.target.value ? parsedResult.matchedCustomer : null);
                    if (found) {
                      setCustomerPhone(found.phone);
                      setCustomerAddress(found.address);
                    }
                  }}
                >
                  <option value="">-- Choose Customer --</option>
                  {parsedResult?.matchedCustomer && !customers.some(c => String(c.id) === String(parsedResult.matchedCustomer.id)) && (
                    <option value={parsedResult.matchedCustomer.id}>
                      {parsedResult.matchedCustomer.business_name ? `${parsedResult.matchedCustomer.business_name} (${parsedResult.matchedCustomer.name})` : parsedResult.matchedCustomer.name} - {parsedResult.matchedCustomer.phone}
                    </option>
                  )}
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.business_name ? `${c.business_name} (${c.name})` : c.name} - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Delivery Address:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="Street / Shop Location"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Special Instructions:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. deliver chilled, before 12 PM"
                />
              </div>
            </div>

            {/* Extracted Product Items Table */}
            <table className="ocean-table" style={{ marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {parsedResult.parsedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '700' }}>{item.product_name}</td>
                    <td>{item.size || 'Standard'}</td>
                    <td>
                      <span style={{ fontWeight: '800', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px' }}>
                        {item.quantity}
                      </span>
                    </td>
                    <td>₹{item.price}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{item.subtotal}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ fontWeight: '800', textAlign: 'right' }}>Total Amount:</td>
                  <td style={{ fontWeight: '800', fontSize: '16px', color: '#059669', textAlign: 'right' }}>
                    ₹{parsedResult.totalAmount}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Action to confirm order */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setParsedResult(null)} 
                className="btn btn-secondary"
              >
                Discard
              </button>
              <button 
                onClick={handleCreateStructuredOrder}
                className="btn btn-primary"
              >
                <CheckCircle size={16} />
                <span>Confirm & Create Structured Order</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Orders Management Queue */}
      <div className="ocean-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              WhatsApp Orders Queue ({whatsappOrders.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Manage incoming orders, delivery lifecycle, and trigger WhatsApp notifications
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {whatsappOrders.map(order => (
            <div 
              key={order.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Row 1: Order header & badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: '800', color: '#0284c7', fontSize: '15px' }}>{order.order_number}</span>
                  <span className={`badge badge-${order.delivery_status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {order.delivery_status}
                  </span>
                  <span className={`badge badge-${order.payment_status.toLowerCase()}`}>
                    {order.payment_status}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(order.order_date || order.created_at).toLocaleDateString()} {new Date(order.order_date || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ fontWeight: '800', fontSize: '18px', color: '#059669' }}>
                  ₹{order.total_amount}
                </div>
              </div>

              {/* Row 2: Customer info & Items summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                    {order.business_name ? `${order.business_name} • ${order.customer_name}` : order.customer_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span>📞 {order.customer_phone}</span>
                    <span>•</span>
                    <MapPin size={12} />
                    <span>{order.delivery_address || order.customer_address}</span>
                  </div>
                  {order.special_instructions && (
                    <div style={{ fontSize: '12px', color: '#d97706', fontStyle: 'italic', marginTop: '4px' }}>
                      Note: {order.special_instructions}
                    </div>
                  )}
                </div>

                {/* Items tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {order.items?.map(it => (
                    <span 
                      key={it.id}
                      style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}
                    >
                      {it.quantity}x {it.product_name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Row 3: Action Buttons from Prompt #3 & #4 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                {/* Workflow Status Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {order.delivery_status === 'New Order' && (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'Confirmed')}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Accept Order
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'Cancelled')}
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Reject Order
                      </button>
                    </>
                  )}

                  {order.delivery_status === 'Confirmed' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#f59e0b', color: '#b45309' }}
                    >
                      Mark as Preparing
                    </button>
                  )}

                  {order.delivery_status === 'Preparing' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Out for Delivery')}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Mark Out for Delivery
                    </button>
                  )}

                  {order.delivery_status === 'Out for Delivery' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Delivered')}
                      className="btn"
                      style={{ background: '#10b981', color: 'white', padding: '6px 12px', fontSize: '12px' }}
                    >
                      Mark as Delivered
                    </button>
                  )}

                  {order.payment_status !== 'Paid' && (
                    <button 
                      onClick={() => handleMarkPaid(order.id)}
                      className="btn"
                      style={{ background: '#059669', color: 'white', padding: '6px 12px', fontSize: '12px' }}
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>

                {/* WhatsApp Notification Triggers (Prompt #14) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button 
                    onClick={() => sendOrderConfirmation(order, order)}
                    className="btn btn-whatsapp"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    title="Send Order Confirmation via WhatsApp"
                  >
                    <Send size={12} />
                    <span>Confirm Msg</span>
                  </button>

                  <button 
                    onClick={() => sendDeliveryNotification(order, order)}
                    className="btn btn-whatsapp"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    title="Send Out for Delivery Alert via WhatsApp"
                  >
                    <Truck size={12} />
                    <span>Dispatch Msg</span>
                  </button>

                  <button 
                    onClick={() => sendOrderDelivered(order, order)}
                    className="btn btn-whatsapp"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    title="Send Delivered Receipt via WhatsApp"
                  >
                    <CheckCircle size={12} />
                    <span>Delivered Msg</span>
                  </button>

                  {order.payment_status !== 'Paid' && (
                    <button 
                      onClick={() => sendPaymentReminder(order, order.total_amount - (order.paid_amount || 0))}
                      className="btn btn-whatsapp"
                      style={{ padding: '6px 10px', fontSize: '12px', background: '#d97706' }}
                      title="Send Payment Reminder via WhatsApp"
                    >
                      <DollarSign size={12} />
                      <span>Payment Reminder</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
