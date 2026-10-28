import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { openWhatsApp } from '../utils/whatsapp';
import { openGoogleMapsPin } from '../utils/maps';

export default function GlobalSearchModal({ isOpen, onClose, onSelectCustomer, onSelectOrder }) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [cRes, oRes, pRes] = await Promise.all([
        api.getCustomers(),
        api.getOrders(),
        api.getProducts()
      ]);
      setCustomers(cRes.customers || []);
      setOrders(oRes.orders || []);
      setProducts(pRes.products || []);
    } catch (err) {
      console.error('Error prefetching search data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchAllData();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Filtered results
  const matchedCustomers = q ? customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(q)) ||
    (c.business_name && c.business_name.toLowerCase().includes(q)) ||
    (c.phone && c.phone.includes(q)) ||
    (c.address && c.address.toLowerCase().includes(q))
  ).slice(0, 5) : [];

  const matchedOrders = q ? orders.filter(o =>
    (o.order_number && o.order_number.toLowerCase().includes(q)) ||
    (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
    (o.delivery_address && o.delivery_address.toLowerCase().includes(q)) ||
    (o.items && o.items.some(it => it.product_name && it.product_name.toLowerCase().includes(q)))
  ).slice(0, 5) : [];

  const matchedProducts = q ? products.filter(p =>
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.category && p.category.toLowerCase().includes(q))
  ).slice(0, 5) : [];

  const hasResults = matchedCustomers.length > 0 || matchedOrders.length > 0 || matchedProducts.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', borderRadius: '14px', overflow: 'hidden' }}>
        {/* Search Input Bar (Command Palette Style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
          <Search size={18} color="#0284c7" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search clients, phone numbers, orders, products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ 
              border: 'none', 
              fontSize: '14.5px', 
              outline: 'none', 
              width: '100%', 
              background: 'transparent',
              color: '#0f172a',
              fontFamily: 'inherit'
            }}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            onClick={onClose}
            style={{ 
              background: '#f1f5f9', 
              border: '1px solid #cbd5e1', 
              borderRadius: '4px', 
              padding: '1px 5px', 
              fontSize: '11px', 
              color: '#64748b', 
              fontFamily: 'inherit',
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '14px 18px', background: '#f8fafc' }}>
          {!q && (
            <div style={{ textAlign: 'center', padding: '28px 10px', color: '#64748b' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <Search size={18} color="#94a3b8" />
              </div>
              <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#334155' }}>Instant Command Search</div>
              <p style={{ fontSize: '12px', marginTop: '3px', color: '#94a3b8' }}>Type a client name, mobile number, product or order ID</p>
            </div>
          )}

          {q && !hasResults && !loading && (
            <div style={{ textAlign: 'center', padding: '28px 10px', color: '#64748b' }}>
              <p style={{ fontSize: '13.5px' }}>No matches found for "{query}"</p>
            </div>
          )}

          {/* Customers matches */}
          {matchedCustomers.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.04em' }}>
                Customers ({matchedCustomers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matchedCustomers.map(c => (
                  <div 
                    key={c.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '9px 12px', 
                      background: '#ffffff', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div 
                      style={{ cursor: 'pointer', flex: 1 }} 
                      onClick={() => { onSelectCustomer(c); onClose(); }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#0f172a' }}>
                        {c.business_name ? `${c.business_name} (${c.name})` : c.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span>📞 {c.phone}</span>
                        <span>•</span>
                        <span>{c.customer_type}</span>
                        <span>•</span>
                        <span style={{ color: c.balance_pending > 0 ? '#e11d48' : '#059669', fontWeight: '600' }}>
                          {c.balance_pending > 0 ? `Pending: ₹${c.balance_pending}` : 'All Paid'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => openWhatsApp(c.whatsapp_number || c.phone, `Hello ${c.name}, Ocean Enterprises here!`)}
                        style={{ padding: '5px 8px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', cursor: 'pointer' }}
                        title="WhatsApp"
                      >
                        <MessageSquare size={13} />
                      </button>
                      <button 
                        onClick={() => openGoogleMapsPin(c.latitude, c.longitude, c.address)}
                        style={{ padding: '5px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#0284c7', cursor: 'pointer' }}
                        title="Google Maps"
                      >
                        <MapPin size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders matches */}
          {matchedOrders.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.04em' }}>
                Orders ({matchedOrders.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matchedOrders.map(o => (
                  <div 
                    key={o.id} 
                    onClick={() => { onSelectOrder(o); onClose(); }}
                    style={{ 
                      padding: '9px 12px', 
                      background: '#ffffff', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      cursor: 'pointer' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: '#0284c7', fontSize: '13px' }}>{o.order_number}</span>
                      <span className={`badge badge-${o.delivery_status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {o.delivery_status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>
                      {o.customer_name || o.business_name} • ₹{o.total_amount}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {o.items?.map(it => `${it.quantity}x ${it.product_name}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products matches */}
          {matchedProducts.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.04em' }}>
                Products ({matchedProducts.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matchedProducts.map(p => (
                  <div 
                    key={p.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '9px 12px', 
                      background: '#ffffff', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0' 
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>{p.name} ({p.size})</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{p.category} • Price: ₹{p.selling_price}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '600', color: p.stock <= p.minimum_stock ? '#e11d48' : '#0f172a', fontSize: '12.5px' }}>
                        Stock: {p.stock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
