import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Droplet, 
  Users, 
  Truck, 
  MapPin, 
  CreditCard, 
  Package, 
  FileText, 
  BarChart3, 
  Settings, 
  BookOpen,
  HelpCircle,
  LogOut, 
  Menu, 
  X, 
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navigation({ activeTab, setActiveTab, onOpenSearch, onQuickWater, children }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'water', label: 'Rapid Water Entry', icon: Droplet, highlight: true },
    { id: 'whatsapp', label: 'WhatsApp Orders', icon: MessageSquare },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
    { id: 'route', label: 'Route Map', icon: MapPin },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'orders', label: 'All Orders', icon: FileText },
    { id: 'products', label: 'Inventory & Stock', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'docs', label: 'Help & Docs', icon: BookOpen }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Sidebar Navigation - Light SaaS */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Brand in Sidebar */}
        <div style={{ padding: '18px 18px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              border: '1px solid #bae6fd',
              flexShrink: 0
            }}>
              🌊
            </div>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                Ocean Enterprises
              </h1>
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', margin: 0 }}>Operations Workspace</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={item.highlight && !isActive ? { color: '#0284c7', background: '#f0f9ff' } : {}}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '9.5px', 
                    fontWeight: '700', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: '#e0f2fe', 
                    color: '#0369a1' 
                  }}>
                    FAST
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card in Sidebar Footer */}
        <div style={{ 
          padding: '14px 16px', 
          borderTop: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              background: '#eff6ff', 
              color: '#0284c7',
              border: '1px solid #bfdbfe',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: '700',
              fontSize: '12.5px'
            }}>
              {user?.name?.[0]?.toUpperCase() || 'O'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {user?.role || 'Administrator'}
              </div>
            </div>
          </div>
          <button 
            onClick={logout} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#94a3b8', 
              cursor: 'pointer', 
              padding: '6px',
              borderRadius: '6px'
            }} 
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 35 }}
        />
      )}

      {/* Main Content Column (Header + Page Content) */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="btn-secondary"
              style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} 
              onClick={() => setActiveTab('dashboard')}
            >
              <div style={{ 
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                color: 'white', 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '16px',
                flexShrink: 0
              }}>
                🌊
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Ocean Enterprises
                  </span>
                  <span style={{ 
                    background: '#ecfdf5', 
                    color: '#065f46', 
                    fontSize: '10px', 
                    fontWeight: '600', 
                    padding: '1px 6px', 
                    borderRadius: '9999px', 
                    border: '1px solid #a7f3d0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Linear-style Search Trigger Bar */}
            <button 
              onClick={onOpenSearch}
              className="btn-secondary hide-on-mobile"
              style={{ 
                padding: '6px 12px', 
                borderRadius: '7px', 
                fontSize: '12.5px', 
                fontWeight: '500', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                background: '#f8fafc',
                borderColor: '#e2e8f0',
                color: '#64748b'
              }}
              title="Global Search (Ctrl+K)"
            >
              <Search size={14} color="#64748b" />
              <span>Search anything...</span>
              <kbd style={{ 
                background: '#ffffff', 
                border: '1px solid #cbd5e1', 
                borderRadius: '4px', 
                padding: '1px 5px', 
                fontSize: '10px', 
                color: '#64748b', 
                fontFamily: 'inherit',
                boxShadow: '0 1px 1px rgba(0,0,0,0.04)'
              }}>
                Ctrl K
              </kbd>
            </button>

            <button 
              onClick={onQuickWater}
              className="btn btn-primary"
              style={{ 
                padding: '6px 14px', 
                borderRadius: '7px', 
                fontSize: '12.5px', 
                fontWeight: '600'
              }}
              title="Rapid Water Supply Entry (10s)"
            >
              <Droplet size={14} fill="white" />
              <span>+ Rapid Water</span>
            </button>

            <button
              onClick={() => handleNavClick('docs')}
              className="btn-secondary"
              style={{
                padding: '6px 10px',
                borderRadius: '7px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: '600',
                color: activeTab === 'docs' ? '#0284c7' : '#475569',
                borderColor: activeTab === 'docs' ? '#bae6fd' : '#e2e8f0',
                background: activeTab === 'docs' ? '#eff6ff' : '#ffffff'
              }}
              title="Help & Documentation Center (/docs)"
            >
              <HelpCircle size={14} color={activeTab === 'docs' ? '#0284c7' : '#64748b'} />
              <span className="hide-on-mobile">Help</span>
            </button>

            <button 
              onClick={logout}
              className="btn-secondary"
              style={{ padding: '6px 10px', borderRadius: '7px' }}
              title="Log Out"
            >
              <LogOut size={14} color="#64748b" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fast Thumb Access) */}
      <nav className="mobile-bottom-bar">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`mobile-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <LayoutDashboard size={18} />
          <span>Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('water')} 
          className={`mobile-nav-link ${activeTab === 'water' ? 'active' : ''}`}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <Droplet size={18} color={activeTab === 'water' ? '#0284c7' : '#64748b'} />
          <span>Water</span>
        </button>

        <button 
          onClick={() => setActiveTab('whatsapp')} 
          className={`mobile-nav-link ${activeTab === 'whatsapp' ? 'active' : ''}`}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <MessageSquare size={18} color={activeTab === 'whatsapp' ? '#0284c7' : '#64748b'} />
          <span>Orders</span>
        </button>

        <button 
          onClick={() => setActiveTab('deliveries')} 
          className={`mobile-nav-link ${activeTab === 'deliveries' ? 'active' : ''}`}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <Truck size={18} />
          <span>Delivery</span>
        </button>

        <button 
          onClick={() => setActiveTab('customers')} 
          className={`mobile-nav-link ${activeTab === 'customers' ? 'active' : ''}`}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <Users size={18} />
          <span>Clients</span>
        </button>
      </nav>
    </>
  );
}
