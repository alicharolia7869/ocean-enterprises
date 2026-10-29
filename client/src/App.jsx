import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import GlobalSearchModal from './components/GlobalSearchModal';

// Pages
import Dashboard from './pages/Dashboard';
import WhatsAppOrders from './pages/WhatsAppOrders';
import WaterEntry from './pages/WaterEntry';
import Customers from './pages/Customers';
import Deliveries from './pages/Deliveries';
import DeliveryRoute from './pages/DeliveryRoute';
import Products from './pages/Products';
import Payments from './pages/Payments';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import DocumentationCenter from './pages/DocumentationCenter';
import { resolveDocSlugFromPath } from './data/docsContent';

function isDocsPathname(pathname = '') {
  return pathname === '/docs' || pathname.startsWith('/docs/');
}

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined' && isDocsPathname(window.location.pathname) ? 'docs' : 'dashboard'
  );
  const [docSlug, setDocSlug] = useState(() =>
    typeof window !== 'undefined' ? resolveDocSlugFromPath(window.location.pathname) : 'getting-started'
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [openNewOrderModal, setOpenNewOrderModal] = useState(false);
  const [selectedCustomerIdForView, setSelectedCustomerIdForView] = useState(null);

  const handleSelectDocSlug = (slug) => {
    const targetSlug = slug || 'getting-started';
    setDocSlug(targetSlug);
    setActiveTab('docs');
    if (typeof window !== 'undefined') {
      const nextPath = `/docs/${targetSlug}`;
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    }
  };

  const handleSetTab = (tab) => {
    setSelectedCustomerIdForView(null);
    if (tab === 'docs') {
      handleSelectDocSlug(docSlug || 'getting-started');
      return;
    }
    setActiveTab(tab);
    if (typeof window !== 'undefined' && isDocsPathname(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    const handlePopState = () => {
      const path = window.location.pathname;
      if (isDocsPathname(path)) {
        setDocSlug(resolveDocSlugFromPath(path));
        setActiveTab('docs');
      } else {
        setActiveTab((prev) => (prev === 'docs' ? 'dashboard' : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c4a6e', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🌊</div>
          <div style={{ fontWeight: '800', fontSize: '18px' }}>Ocean Enterprises</div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>Loading business workspace...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (activeTab === 'docs') {
      return (
        <DocumentationCenter
          standalone={true}
          isAuthenticated={false}
          activeSlug={docSlug}
          onSelectSlug={handleSelectDocSlug}
          onExitDocs={() => handleSetTab('dashboard')}
        />
      );
    }
    return <Login onOpenDocs={() => handleSelectDocSlug('getting-started')} />;
  }

  const handleSelectCustomerFromSearch = (c) => {
    setSelectedCustomerIdForView(c.id);
    handleSetTab('customers');
  };

  const handleSelectOrderFromSearch = () => {
    handleSetTab('orders');
  };

  return (
    <div className="app-container">
      {/* Navigation (Sidebar, Header, Mobile Bottom Bar, and Page Content) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        onOpenSearch={() => setSearchOpen(true)}
        onQuickWater={() => handleSetTab('water')}
      >
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={handleSetTab}
            onQuickWater={() => handleSetTab('water')}
            onNewOrder={() => {
              handleSetTab('orders');
              setOpenNewOrderModal(true);
            }}
          />
        )}

        {activeTab === 'water' && <WaterEntry />}

        {activeTab === 'whatsapp' && <WhatsAppOrders />}

        {activeTab === 'deliveries' && (
          <Deliveries onOpenRouteMap={() => handleSetTab('route')} />
        )}

        {activeTab === 'route' && <DeliveryRoute />}

        {activeTab === 'customers' && (
          <Customers selectedCustomerIdToOpen={selectedCustomerIdForView} />
        )}

        {activeTab === 'payments' && <Payments />}

        {activeTab === 'orders' && (
          <Orders
            openNewOrderModal={openNewOrderModal}
            onCloseNewOrderModal={() => setOpenNewOrderModal(false)}
          />
        )}

        {activeTab === 'products' && <Products />}

        {activeTab === 'reports' && <Reports />}

        {activeTab === 'settings' && <Settings />}

        {activeTab === 'docs' && (
          <DocumentationCenter
            standalone={false}
            isAuthenticated={true}
            activeSlug={docSlug}
            onSelectSlug={handleSelectDocSlug}
            onExitDocs={() => handleSetTab('dashboard')}
            onQuickWater={() => handleSetTab('water')}
            onOpenWhatsApp={() => handleSetTab('whatsapp')}
          />
        )}
      </Navigation>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectCustomer={handleSelectCustomerFromSearch}
        onSelectOrder={handleSelectOrderFromSearch}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
