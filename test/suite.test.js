const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_verification_2026';

const app = require('../api/index');

let server;
let baseUrl;
let authToken = '';
let testCustomerId = null;
let testProductId = null;
let testOrderId = null;
let testWaterEntryId = null;
let storeBackup = null;

const storePath = path.join(__dirname, '..', 'server', 'data', 'ocean_store.json');

test.before(async () => {
  if (fs.existsSync(storePath)) {
    storeBackup = fs.readFileSync(storePath, 'utf8');
  }

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  // Pre-authenticate admin
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrPhone: 'admin@ocean.com', password: 'admin123' })
  });
  const data = await res.json();
  authToken = data.token;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (storeBackup) {
    try {
      fs.writeFileSync(storePath, storeBackup, 'utf8');
    } catch (e) {}
  }
});

// Helper for HTTP requests
async function req(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.noAuth ? {} : (authToken ? { 'Authorization': `Bearer ${authToken}` } : {})),
    ...(options.headers || {})
  };
  const config = {
    ...options,
    headers
  };
  const res = await fetch(url, config);
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

test('1. System Health & Routing', async (t) => {
  await t.test('GET /api/health returns 200 online', async () => {
    const res = await req('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'online');
    assert.ok(res.data.timestamp);
  });

  await t.test('GET /health alias returns 200 online', async () => {
    const res = await req('/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'online');
  });

  await t.test('GET /api/unknown-endpoint returns 404 JSON', async () => {
    const res = await req('/api/unknown-endpoint-test-route');
    assert.equal(res.status, 404);
    assert.ok(res.data.error);
  });
});

test('2. Authentication & Security', async (t) => {
  await t.test('Reject login without credentials', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
  });

  await t.test('Reject login with non-existent user', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone: 'nonexistent@example.com', password: 'wrong' })
    });
    assert.equal(res.status, 401);
  });

  await t.test('Reject login with wrong password', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone: 'admin@ocean.com', password: 'wrongpassword' })
    });
    assert.equal(res.status, 401);
  });

  await t.test('Admin login succeeds and returns valid JWT token', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone: 'admin@ocean.com', password: 'admin123' })
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.token);
    assert.ok(res.data.user);
    assert.equal(res.data.user.role, 'admin');
    assert.equal(res.data.user.password_hash, undefined, 'Password hash must never leak');
    authToken = res.data.token;
  });

  await t.test('Protected endpoint rejects request without token', async () => {
    const res = await req('/api/auth/me', { noAuth: true });
    assert.equal(res.status, 401);
  });

  await t.test('Protected endpoint rejects malformed token', async () => {
    const res = await req('/api/auth/me', {
      noAuth: true,
      headers: { 'Authorization': 'Bearer bad_token_signature_12345' }
    });
    assert.equal(res.status, 401);
  });

  await t.test('GET /api/auth/me returns authenticated user details', async () => {
    const res = await req('/api/auth/me');
    assert.equal(res.status, 200);
    assert.ok(res.data.user);
    assert.equal(res.data.user.role, 'admin');
    assert.equal(res.data.user.password_hash, undefined);
  });
});

test('3. Dashboard Operations', async (t) => {
  await t.test('GET /api/dashboard/stats returns complete business stats', async () => {
    const res = await req('/api/dashboard/stats');
    assert.equal(res.status, 200);
    assert.ok(res.data.summary, 'Must contain summary cards');
    assert.ok('today_revenue' in res.data.summary);
    assert.ok('month_revenue' in res.data.summary);
    assert.ok('total_pending' in res.data.summary);
    assert.ok(Array.isArray(res.data.recent_orders));
    assert.ok(Array.isArray(res.data.pending_payments));
    assert.ok(Array.isArray(res.data.low_stock));
  });
});

test('4. Customer Management', async (t) => {
  await t.test('Reject customer creation with missing required name', async () => {
    const res = await req('/api/customers', {
      method: 'POST',
      body: JSON.stringify({ phone: '03110000000' })
    });
    assert.equal(res.status, 400);
  });

  await t.test('Create new customer with complete details', async () => {
    const newCust = {
      name: 'Verification Test Client',
      business_name: 'Ocean Test Mart',
      phone: '03119999999',
      whatsapp_number: '03119999999',
      address: 'Suite 101, Test Business Complex, Karachi',
      customer_type: 'Shop',
      default_rate_20l: 180,
      payment_type: 'Credit',
      notes: 'Automated regression test customer'
    };
    const res = await req('/api/customers', {
      method: 'POST',
      body: JSON.stringify(newCust)
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.customer);
    assert.equal(res.data.customer.name, newCust.name);
    testCustomerId = res.data.customer.id;
  });

  await t.test('Retrieve created customer by ID', async () => {
    const res = await req(`/api/customers/${testCustomerId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.customer.name, 'Verification Test Client');
    assert.ok('pending_balance' in res.data.customer);
  });

  await t.test('Update customer details', async () => {
    const res = await req(`/api/customers/${testCustomerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Verification Test Client Updated',
        business_name: 'Ocean Test Mart Premium',
        phone: '03119999999',
        customer_type: 'Shop',
        default_rate_20l: 190
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.customer.name, 'Verification Test Client Updated');
  });

  await t.test('Save customer GPS coordinates', async () => {
    const res = await req(`/api/customers/${testCustomerId}/location`, {
      method: 'POST',
      body: JSON.stringify({
        latitude: 24.8607,
        longitude: 67.0011,
        address: 'Geo-tagged Location Karachi'
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.customer.latitude, 24.8607);
    assert.equal(res.data.customer.longitude, 67.0011);
  });

  await t.test('List customers includes test customer', async () => {
    const res = await req('/api/customers');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.customers));
    const found = res.data.customers.find(c => c.id === testCustomerId);
    assert.ok(found, 'Created customer must be in customer list');
  });
});

test('5. Product & Inventory Management', async (t) => {
  await t.test('Create new product with inventory', async () => {
    const res = await req('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ocean Premium Alkaline 19L',
        category: 'Water',
        size: '19L Bottle',
        selling_price: 250,
        purchase_price: 150,
        stock: 50,
        minimum_stock: 10
      })
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.product);
    assert.equal(res.data.product.stock, 50);
    testProductId = res.data.product.id;
  });

  await t.test('Adjust product stock quantity', async () => {
    const res = await req(`/api/products/${testProductId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({
        quantity: 10,
        type: 'add'
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.product.stock, 60);
  });

  await t.test('Prevent negative stock below zero', async () => {
    const res = await req(`/api/products/${testProductId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({
        quantity: 100,
        type: 'remove'
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.product.stock, 0, 'Stock must not be negative');
  });

  await t.test('Set stock back for subsequent tests', async () => {
    const res = await req(`/api/products/${testProductId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({
        quantity: 100,
        type: 'set'
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.product.stock, 100);
  });
});

test('6. Rapid Water Entry Workflow', async (t) => {
  await t.test('Log water delivery entry and verify inventory deduction', async () => {
    const beforeProduct = await req(`/api/products`);
    const initialProduct = beforeProduct.data.products.find(p => p.id === testProductId);
    const initialStock = initialProduct.stock;

    const res = await req('/api/water', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        product_id: testProductId,
        quantity: 5,
        price: 250,
        payment_status: 'Pending',
        notes: 'Rapid water entry test'
      })
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.entry);
    assert.equal(res.data.entry.total_amount, 1250);
    testWaterEntryId = res.data.entry.id;

    // Verify product stock auto-deducted
    const afterProduct = await req(`/api/products`);
    const updatedProduct = afterProduct.data.products.find(p => p.id === testProductId);
    assert.equal(updatedProduct.stock, initialStock - 5);
  });

  await t.test('Customer pending balance reflects unpaid water entry', async () => {
    const res = await req(`/api/customers/${testCustomerId}`);
    assert.equal(res.status, 200);
    assert.ok(res.data.customer.pending_balance >= 1250);
  });

  await t.test('Retrieve water entries list', async () => {
    const res = await req('/api/water');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.entries));
    assert.ok(res.data.today_stats);
  });
});

test('7. Orders & WhatsApp Parsing', async (t) => {
  await t.test('Parse unstructured WhatsApp order text', async () => {
    const res = await req('/api/orders/parse-whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Bhai send 10 bottles of Ocean Water and 2 cartons of juice urgent please'
      })
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.items));
    assert.ok(res.data.items.length > 0);
  });

  await t.test('Create multi-item order and verify auto delivery creation', async () => {
    const res = await req('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        delivery_address: 'Suite 101, Test Business Complex, Karachi',
        items: [
          {
            product_id: testProductId,
            quantity: 4,
            unit_price: 250
          }
        ],
        notes: 'Order verification test'
      })
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.order);
    assert.equal(res.data.order.total_amount, 1000);
    assert.equal(res.data.order.payment_status, 'Pending');
    testOrderId = res.data.order.id;
  });

  await t.test('Order appears in orders list with item details', async () => {
    const res = await req(`/api/orders/${testOrderId}`);
    assert.equal(res.status, 200);
    assert.ok(res.data.order);
    assert.equal(res.data.order.items.length, 1);
  });

  await t.test('Update order delivery status to Delivered', async () => {
    const res = await req(`/api/orders/${testOrderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'Delivered'
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'Delivered');
  });
});

test('8. Deliveries & Route Dispatch', async (t) => {
  await t.test('GET /api/deliveries lists scheduled deliveries', async () => {
    const res = await req('/api/deliveries');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.deliveries));
    const d = res.data.deliveries.find(del => del.order_id === testOrderId);
    assert.ok(d, 'Delivery record must exist for order');
  });

  await t.test('Update delivery status to Delivered with notes', async () => {
    const listRes = await req('/api/deliveries');
    const d = listRes.data.deliveries.find(del => del.order_id === testOrderId);
    const res = await req(`/api/deliveries/${d.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'Delivered',
        driver_notes: 'Delivered safely at front desk'
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.delivery.status, 'Delivered');
  });
});

test('9. Payment Allocation & Customer Balance', async (t) => {
  await t.test('Record payment allocated to test order', async () => {
    const res = await req('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        order_id: testOrderId,
        amount: 1000,
        payment_mode: 'Cash',
        notes: 'Full payment for test order'
      })
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.payment);

    // Verify order marked as Paid
    const orderRes = await req(`/api/orders/${testOrderId}`);
    assert.equal(orderRes.data.order.payment_status, 'Paid');
    assert.equal(orderRes.data.order.paid_amount, 1000);
  });

  await t.test('Record payment for pending water entry', async () => {
    const res = await req('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        amount: 1250,
        payment_mode: 'Bank Transfer',
        notes: 'Clearing water entry'
      })
    });
    assert.equal(res.status, 201);

    // Verify customer outstanding balance decreased to 0
    const custRes = await req(`/api/customers/${testCustomerId}`);
    assert.equal(custRes.data.customer.pending_balance, 0);
  });
});

test('10. Business Reports & Analytics', async (t) => {
  await t.test('GET /api/reports/sales returns accurate calculations', async () => {
    const res = await req('/api/reports/sales');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.salesData));
  });

  await t.test('GET /api/reports/customer-wise returns customer ledgers', async () => {
    const res = await req('/api/reports/customer-wise');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.customerWise));
  });

  await t.test('GET /api/reports/product-wise returns product sales performance', async () => {
    const res = await req('/api/reports/product-wise');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.productWise));
  });
});

test('11. Business Settings', async (t) => {
  await t.test('GET and update business settings', async () => {
    const getRes = await req('/api/settings');
    assert.equal(getRes.status, 200);

    const putRes = await req('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        business_name: 'Ocean Enterprises Karachi',
        default_rate_20l: '180'
      })
    });
    assert.equal(putRes.status, 200);
    assert.equal(putRes.data.settings.business_name, 'Ocean Enterprises Karachi');
  });
});
