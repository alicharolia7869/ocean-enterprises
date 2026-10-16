const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('ocean_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('ocean_token');
      localStorage.removeItem('ocean_user');
      window.dispatchEvent(new Event('ocean_auth_change'));
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (emailOrPhone, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ emailOrPhone, password }) }),
  getMe: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),

  // Customers
  getCustomers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/customers${q ? '?' + q : ''}`);
  },
  getCustomerById: (id) => request(`/customers/${id}`),
  createCustomer: (customerData) => request('/customers', { method: 'POST', body: JSON.stringify(customerData) }),
  updateCustomer: (id, customerData) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(customerData) }),
  saveCustomerLocation: (id, locationData) => request(`/customers/${id}/location`, { method: 'POST', body: JSON.stringify(locationData) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/products${q ? '?' + q : ''}`);
  },
  createProduct: (productData) => request('/products', { method: 'POST', body: JSON.stringify(productData) }),
  updateProduct: (id, productData) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(productData) }),
  adjustStock: (id, stockData) => request(`/products/${id}/stock`, { method: 'POST', body: JSON.stringify(stockData) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/orders${q ? '?' + q : ''}`);
  },
  getOrderById: (id) => request(`/orders/${id}`),
  createOrder: (orderData) => request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateOrderPayment: (id, paymentData) => request(`/orders/${id}/payment`, { method: 'PUT', body: JSON.stringify(paymentData) }),
  parseWhatsAppOrder: (messageText) => request('/orders/parse-whatsapp', { method: 'POST', body: JSON.stringify({ messageText }) }),

  // Water Entries (Rapid Entry)
  getWaterEntries: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/water${q ? '?' + q : ''}`);
  },
  getWaterSummary: (month) => request(`/water/summary${month ? '?month=' + month : ''}`),
  createWaterEntry: (entryData) => request('/water', { method: 'POST', body: JSON.stringify(entryData) }),
  deleteWaterEntry: (id) => request(`/water/${id}`, { method: 'DELETE' }),

  // Deliveries & Routes
  getDeliveries: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/deliveries${q ? '?' + q : ''}`);
  },
  updateDeliveryStatus: (id, statusData) => request(`/deliveries/${id}/status`, { method: 'PUT', body: JSON.stringify(statusData) }),
  reorderDeliveries: (sequences) => request('/deliveries/reorder', { method: 'PUT', body: JSON.stringify({ sequences }) }),

  // Payments
  getPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/payments${q ? '?' + q : ''}`);
  },
  recordPayment: (paymentData) => request('/payments', { method: 'POST', body: JSON.stringify(paymentData) }),

  // Reports
  getSalesReport: (period) => request(`/reports/sales?period=${period || 'daily'}`),
  getCustomerWiseReport: () => request('/reports/customer-wise'),
  getProductWiseReport: () => request('/reports/product-wise'),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settingsData) => request('/settings', { method: 'PUT', body: JSON.stringify(settingsData) })
};
