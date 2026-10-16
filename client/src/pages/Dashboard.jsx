import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Droplet, 
  CupSoda, 
  Truck, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  ArrowRight, 
  Plus, 
  MessageSquare, 
  MapPin, 
  Package, 
  BarChart2, 
  CreditCard,
  RefreshCw,
  Zap,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ setActiveTab, onQuickWater, onNewOrder }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard metrics. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      fetchStats();
    } catch (err) {
      alert('Error updating order status: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Operations Header - Modern SaaS Minimalist */}
      <div style={{ 
        background: '#ffffff', 
        padding: '20px 24px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.04)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Operations & Distribution Command
            </h2>
            <div style={{ 
              background: '#ecfdf5', 
              color: '#065f46', 
              fontSize: '11px', 
              fontWeight: '600', 
              padding: '2px 8px', 
              borderRadius: '9999px', 
              border: '1px solid #a7f3d0',
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px' 
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              PLANT LIVE
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
            Real-time delivery fleet, 20L water plant, and WhatsApp sales monitoring
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={fetchStats}
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', padding: '7px 13px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync Live</span>
          </button>

          <button 
            onClick={onQuickWater}
            className="btn btn-primary"
            style={{ fontSize: '12.5px', padding: '7px 14px' }}
          >
            <Droplet size={14} fill="white" />
            <span>+ Rapid Water</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '12px 16px', borderRadius: '10px', color: '#9f1239', fontSize: '13.5px' }}>
          {error}
        </div>
      )}

      {/* 9 Core Metric Cards - Clean Stripe / Linear SaaS Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* 1. Today's Total Orders */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Today's Orders</span>
            <div style={{ background: '#f0f9ff', color: '#0284c7', padding: '8px', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value">{stats?.todayOrdersCount ?? '-'}</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Direct & WhatsApp orders</div>
          </div>
        </div>

        {/* 2. Today's Water Quantity */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Water Quantity</span>
            <div style={{ background: '#eff6ff', color: '#0284c7', padding: '8px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <Droplet size={18} fill="#0284c7" />
            </div>
          </div>
          <div>
            <div className="stat-value">
              {stats?.todayWaterQuantity ?? '-'}{' '}
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Jars (20L)</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '4px', fontWeight: '500' }}>Drinking water supplied</div>
          </div>
        </div>

        {/* 3. Today's Beverage Orders */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Beverage Orders</span>
            <div style={{ background: '#fffbeb', color: '#d97706', padding: '8px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <CupSoda size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value">{stats?.todayBeverageOrdersCount ?? '-'}</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              {stats?.todayBeverageUnits ?? 0} bottles / crates out
            </div>
          </div>
        </div>

        {/* 4. Pending Deliveries */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Pending Deliveries</span>
            <div style={{ background: '#eff6ff', color: '#0369a1', padding: '8px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <Truck size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value">{stats?.pendingDeliveries ?? '-'}</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>In dispatch & en route</div>
          </div>
        </div>

        {/* 5. Completed Deliveries */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Completed Deliveries</span>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: '#059669' }}>{stats?.completedDeliveriesToday ?? '-'}</div>
            <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px', fontWeight: '500' }}>Fulfilled today</div>
          </div>
        </div>

        {/* 6. Pending Payments */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Pending Payments</span>
            <div style={{ background: '#fff1f2', color: '#e11d48', padding: '8px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
              <Clock size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: '#e11d48' }}>
              ₹{stats?.totalPendingAmount?.toLocaleString() ?? '-'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#9f1239', marginTop: '4px', fontWeight: '500' }}>Ledger receivables</div>
          </div>
        </div>

        {/* 7. Today's Total Sales */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Today's Total Sales</span>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: '#0f172a' }}>
              ₹{stats?.todayTotalSales?.toLocaleString() ?? '-'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Water jars + beverage billings</div>
          </div>
        </div>

        {/* 8. Monthly Sales */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Monthly Sales</span>
            <div style={{ background: '#f8fafc', color: '#334155', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value">
              ₹{stats?.monthlySales?.toLocaleString() ?? '-'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Cumulative month revenue</div>
          </div>
        </div>

        {/* 9. Total Customers */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Clients</span>
            <div style={{ background: '#f8fafc', color: '#475569', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value">{stats?.totalCustomers ?? '-'}</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Shops, restaurants, offices</div>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="ocean-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#0284c7" />
            <span>Fast Operational Shortcuts</span>
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ONE-TAP DIRECT ACTIONS</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          <button onClick={onNewOrder} className="quick-action-btn">
            <div style={{ background: '#eff6ff', color: '#0284c7', padding: '9px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <Plus size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>+ New Order</span>
          </button>

          <button onClick={onQuickWater} className="quick-action-btn" style={{ borderColor: '#bae6fd', background: '#f0f9ff' }}>
            <div style={{ background: '#0284c7', color: 'white', padding: '9px', borderRadius: '8px' }}>
              <Droplet size={18} fill="white" />
            </div>
            <span style={{ color: '#0284c7', fontWeight: '700' }}>💧 Water Entry</span>
          </button>

          <button onClick={() => setActiveTab('whatsapp')} className="quick-action-btn">
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '9px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <MessageSquare size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>WhatsApp Orders</span>
          </button>

          <button onClick={() => setActiveTab('customers')} className="quick-action-btn">
            <div style={{ background: '#f8fafc', color: '#475569', padding: '9px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Users size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>Clients</span>
          </button>

          <button onClick={() => setActiveTab('deliveries')} className="quick-action-btn">
            <div style={{ background: '#f8fafc', color: '#475569', padding: '9px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Truck size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>Deliveries</span>
          </button>

          <button onClick={() => setActiveTab('payments')} className="quick-action-btn">
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '9px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <CreditCard size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>Payments</span>
          </button>

          <button onClick={() => setActiveTab('products')} className="quick-action-btn">
            <div style={{ background: '#f8fafc', color: '#475569', padding: '9px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Package size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>Products</span>
          </button>

          <button onClick={() => setActiveTab('route')} className="quick-action-btn">
            <div style={{ background: '#fff1f2', color: '#e11d48', padding: '9px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
              <MapPin size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>Route Map</span>
          </button>

          <button onClick={() => setActiveTab('reports')} className="quick-action-btn">
            <div style={{ background: '#f8fafc', color: '#475569', padding: '9px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <BarChart2 size={18} />
            </div>
            <span style={{ color: '#0f172a' }}>Reports</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alerts Banner */}
      {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: '600', fontSize: '14px' }}>
              <AlertTriangle size={17} color="#d97706" />
              <span>Low Inventory Stock Warnings ({stats.lowStockProducts.length} items)</span>
            </div>
            <button 
              onClick={() => setActiveTab('products')} 
              style={{ background: 'transparent', border: 'none', color: '#b45309', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Restock Catalog</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {stats.lowStockProducts.map(p => (
              <div 
                key={p.id}
                style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a', minWidth: '180px' }}
              >
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{p.name}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>{p.size}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
                  <span style={{ color: '#dc2626', fontWeight: '700' }}>Stock: {p.stock}</span>
                  <span style={{ color: '#64748b' }}>Min: {p.minimum_stock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders & Delivery Dispatch Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* Recent Orders List */}
        <div className="ocean-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Today's Active Orders</h3>
            <button 
              onClick={() => setActiveTab('orders')}
              style={{ background: 'transparent', border: 'none', color: '#0284c7', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              <span>View All ({stats?.recentOrders?.length || 0})</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats?.recentOrders?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '13px' }}>
                No active orders recorded for today yet.
              </div>
            )}

            {stats?.recentOrders?.map(order => (
              <div 
                key={order.id}
                style={{ 
                  padding: '12px 14px', 
                  borderRadius: '10px', 
                  background: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '10px',
                  transition: 'background 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{order.order_number}</span>
                    <span className={`badge badge-${order.delivery_status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.delivery_status}
                    </span>
                    {order.source === 'WhatsApp' && (
                      <span style={{ fontSize: '9.5px', background: '#ecfdf5', color: '#065f46', padding: '1px 6px', borderRadius: '9999px', fontWeight: '600', border: '1px solid #a7f3d0' }}>
                        WhatsApp
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#334155', marginTop: '3px' }}>
                    {order.business_name || order.customer_name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    ₹{order.total_amount} • Status: <strong style={{ color: order.payment_status === 'Paid' ? '#059669' : '#e11d48' }}>{order.payment_status}</strong>
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {order.delivery_status === 'New Order' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Confirmed')}
                      className="btn-secondary" 
                      style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                    >
                      Confirm
                    </button>
                  )}
                  {order.delivery_status === 'Confirmed' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                      className="btn-secondary" 
                      style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px', borderColor: '#fde68a', color: '#b45309' }}
                    >
                      Prepare
                    </button>
                  )}
                  {order.delivery_status === 'Preparing' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Out for Delivery')}
                      className="btn btn-primary" 
                      style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                    >
                      Dispatch
                    </button>
                  )}
                  {order.delivery_status === 'Out for Delivery' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Delivered')}
                      className="btn" 
                      style={{ background: '#10b981', color: 'white', padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px', fontWeight: '600' }}
                    >
                      ✓ Delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Delivery Dispatch Breakdown */}
        <div className="ocean-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
            Live Dispatch Pipeline
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'New Orders', key: 'New Order', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
              { label: 'Confirmed', key: 'Confirmed', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' },
              { label: 'Preparing', key: 'Preparing', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
              { label: 'Out for Delivery', key: 'Out for Delivery', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
              { label: 'Delivered', key: 'Delivered', color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' }
            ].map(stage => {
              const count = stats?.deliveryBreakdown?.find(d => d.delivery_status === stage.key)?.count || 0;
              return (
                <div 
                  key={stage.key} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '10px 14px', 
                    borderRadius: '8px', 
                    background: stage.bg,
                    border: `1px solid ${stage.border}`
                  }}
                >
                  <span style={{ fontWeight: '600', fontSize: '13px', color: stage.color }}>{stage.label}</span>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: stage.color }}>{count}</span>
                </div>
              );
            })}

            <button 
              onClick={() => setActiveTab('deliveries')}
              className="btn btn-primary"
              style={{ marginTop: '8px', width: '100%', padding: '10px', fontSize: '13.5px' }}
            >
              <Truck size={16} />
              <span>Open Delivery Dispatch Board</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
