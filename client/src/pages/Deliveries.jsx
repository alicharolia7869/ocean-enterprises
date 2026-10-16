import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Navigation as NavIcon, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Send, 
  Compass, 
  RefreshCw,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import { openGoogleMapsNavigation, openGoogleMapsPin } from '../utils/maps';
import { sendDeliveryNotification, sendOrderDelivered } from '../utils/whatsapp';

export default function Deliveries({ onOpenRouteMap }) {
  const [deliveries, setDeliveries] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveries();
  }, [statusFilter]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const res = await api.getDeliveries({ status: statusFilter });
      setDeliveries(res.deliveries || []);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateDeliveryStatus(id, { status: newStatus });
      loadDeliveries();
    } catch (err) {
      alert('Error updating delivery status: ' + err.message);
    }
  };

  const handleMoveSequence = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= deliveries.length) return;

    const newDeliveries = [...deliveries];
    const temp = newDeliveries[index];
    newDeliveries[index] = newDeliveries[targetIdx];
    newDeliveries[targetIdx] = temp;

    const sequences = newDeliveries.map((d, i) => ({ id: d.id, route_sequence: i + 1 }));
    setDeliveries(newDeliveries);

    try {
      await api.reorderDeliveries(sequences);
    } catch (err) {
      console.error('Error saving new sequence:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#0284c7', color: 'white', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <Truck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                Delivery Management Board
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Live dispatch tracking, route stops, and one-click driver navigation
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onOpenRouteMap} className="btn btn-primary">
            <MapPin size={15} />
            <span>Interactive Route Map</span>
          </button>

          <button onClick={loadDeliveries} className="btn btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Status Filter Bar */}
      <div className="ocean-card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginRight: '4px' }}>Filter:</span>
          {['All', 'New Order', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                border: statusFilter === st ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                background: statusFilter === st ? '#eff6ff' : '#ffffff',
                color: statusFilter === st ? '#0284c7' : '#64748b',
                transition: 'all 0.12s ease'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Cards in Route Sequence */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {deliveries.length === 0 ? (
          <div className="ocean-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <Truck size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontWeight: '700' }}>No deliveries found for this filter.</p>
          </div>
        ) : (
          deliveries.map((deliv, index) => (
            <div 
              key={deliv.id}
              className="ocean-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderLeft: deliv.status === 'Delivered' ? '6px solid #10b981' : (deliv.status === 'Out for Delivery' ? '6px solid #0284c7' : '6px solid #f59e0b')
              }}
            >
              {/* Row 1: Route Stop Sequence, Customer, and Status Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Sequence Pill (Delivery 1, Delivery 2...) */}
                  <div style={{ background: '#0c4a6e', color: 'white', padding: '6px 12px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Stop #{index + 1}</span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                      {deliv.business_name || deliv.customer_name}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Order: <strong>{deliv.order_number}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge badge-${deliv.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {deliv.status}
                  </span>
                  <span className={`badge badge-${deliv.payment_status.toLowerCase()}`}>
                    Payment: {deliv.payment_status}
                  </span>

                  {/* Reorder Buttons */}
                  <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
                    <button 
                      onClick={() => handleMoveSequence(index, -1)}
                      disabled={index === 0}
                      style={{ border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}
                      title="Move Up in Route"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button 
                      onClick={() => handleMoveSequence(index, 1)}
                      disabled={index === deliveries.length - 1}
                      style={{ border: 'none', background: 'transparent', cursor: index === deliveries.length - 1 ? 'default' : 'pointer', opacity: index === deliveries.length - 1 ? 0.3 : 1 }}
                      title="Move Down in Route"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Location & Items Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Delivery Destination:
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <MapPin size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{deliv.delivery_address}</span>
                  </div>
                  {deliv.special_instructions && (
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '6px', fontStyle: 'italic' }}>
                      Instructions: "{deliv.special_instructions}"
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Package Items & Amount:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {deliv.order_items?.map(it => (
                      <span key={it.id} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                        {it.quantity}x {it.product_name}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '800', color: '#059669' }}>
                    Total: ₹{deliv.total_amount} {deliv.paid_amount > 0 ? `(Paid: ₹${deliv.paid_amount})` : '(Due on Delivery)'}
                  </div>
                </div>
              </div>

              {/* Row 3: Action Buttons (Prompt #7 Navigate Button + WhatsApp Notification) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                {/* Driver Navigation */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openGoogleMapsNavigation(deliv.latitude, deliv.longitude, deliv.delivery_address)}
                    className="btn btn-primary"
                    style={{ padding: '7px 14px', fontSize: '12.5px' }}
                    title="Open Turn-by-Turn GPS Navigation in Google Maps"
                  >
                    <NavIcon size={15} />
                    <span>Navigate (Google Maps)</span>
                  </button>

                  <a
                    href={`tel:${deliv.customer_phone}`}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '13px', textDecoration: 'none' }}
                  >
                    <Phone size={14} color="#0284c7" />
                    <span>Call Client</span>
                  </a>
                </div>

                {/* Status Advancement Controls */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {deliv.status !== 'Out for Delivery' && deliv.status !== 'Delivered' && (
                    <button
                      onClick={() => handleStatusChange(deliv.id, 'Out for Delivery')}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '12px', borderColor: '#0284c7', color: '#0369a1', fontWeight: '700' }}
                    >
                      <Truck size={14} />
                      <span>Start Delivery</span>
                    </button>
                  )}

                  {deliv.status === 'Out for Delivery' && (
                    <>
                      <button
                        onClick={() => sendDeliveryNotification(deliv, deliv)}
                        className="btn btn-whatsapp"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      >
                        <Send size={14} />
                        <span>Send Arrival Msg</span>
                      </button>

                      <button
                        onClick={() => {
                          handleStatusChange(deliv.id, 'Delivered');
                          sendOrderDelivered(deliv, deliv);
                        }}
                        className="btn"
                        style={{ background: '#10b981', color: 'white', padding: '8px 16px', fontSize: '13px', fontWeight: '800' }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Mark as Delivered ✓</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
