import React, { useState } from 'react';
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

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [openNewOrderModal, setOpenNewOrderModal] = useState(false);
  const [selectedCustomerIdForView, setSelectedCustomerIdForView] = useState(null);

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
    return <Login />;
  }

  const handleSelectCustomerFromSearch = (c) => {
    setSelectedCustomerIdForView(c.id);
    setActiveTab('customers');
  };

  const handleSelectOrderFromSearch = (o) => {
    setActiveTab('orders');
  };

  return (
    <div className="app-container">
      {/* Navigation (Sidebar, Header, Mobile Bottom Bar, and Page Content) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedCustomerIdForView(null);
          setActiveTab(tab);
        }}
        onOpenSearch={() => setSearchOpen(true)}
        onQuickWater={() => setActiveTab('water')}
      >
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            onQuickWater={() => setActiveTab('water')}
            onNewOrder={() => {
              setActiveTab('orders');
              setOpenNewOrderModal(true);
            }}
          />
        )}

        {activeTab === 'water' && <WaterEntry />}

        {activeTab === 'whatsapp' && <WhatsAppOrders />}

        {activeTab === 'deliveries' && (
          <Deliveries onOpenRouteMap={() => setActiveTab('route')} />
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
