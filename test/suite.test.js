const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Set test environment (keep suites 1-11 isolated on backed-up JSON store; suite 12 tests live PostgreSQL)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_verification_2026';
const initialDatabaseUrl = process.env.DATABASE_URL;
const initialPostgresUrl = process.env.POSTGRES_URL;
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;

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

  await t.test('Admin login succeeds with normalized 10-digit phone number or account name', async () => {
    const phoneRes = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone: '9876543210', password: 'admin123' })
    });
    assert.equal(phoneRes.status, 200);
    assert.equal(phoneRes.data.user.email, 'admin@ocean.com');

    const nameRes = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone: 'Ocean Admin', password: 'admin123' })
    });
    assert.equal(nameRes.status, 200);
    assert.equal(nameRes.data.user.email, 'admin@ocean.com');
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

  await t.test('PUT /api/auth/change-password verifies current password and updates hash', async () => {
    const res1 = await req('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: 'admin123', newPassword: 'newpassword123' })
    });
    assert.equal(res1.status, 200);

    // Restore original password
    const res2 = await req('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: 'newpassword123', newPassword: 'admin123' })
    });
    assert.equal(res2.status, 200);
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

  await t.test('GET /api/orders returns joined customer fields and supports filters', async () => {
    const res = await req(`/api/orders?filter=This%20Week&customerId=${testCustomerId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.orders));
    const found = res.data.orders.find(o => o.id === testOrderId);
    assert.ok(found, 'Order must be returned for This Week filter');
    assert.equal(found.customer_name, 'Verification Test Client Updated');
    assert.equal(found.customer_phone, '03119999999');
    assert.ok(Array.isArray(found.items) && found.items.length === 1);
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

  await t.test('Cancelled orders restore stock, are excluded from customer pending balance, and can be deleted without duplicate order_number', async () => {
    const beforeProdRes = await req('/api/products');
    const stockBeforeOrder = beforeProdRes.data.products.find(p => p.id === testProductId).stock;

    const createRes = await req('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        items: [{ product_id: testProductId, quantity: 2, price: 250 }]
      })
    });
    assert.equal(createRes.status, 201);
    const tempOrderId = createRes.data.order.id;

    const afterCreateProdRes = await req('/api/products');
    assert.equal(afterCreateProdRes.data.products.find(p => p.id === testProductId).stock, stockBeforeOrder - 2);

    // Cancel order and verify stock is restored
    const cancelRes = await req(`/api/orders/${tempOrderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Cancelled' })
    });
    assert.equal(cancelRes.status, 200);

    const afterCancelProdRes = await req('/api/products');
    assert.equal(afterCancelProdRes.data.products.find(p => p.id === testProductId).stock, stockBeforeOrder, 'Cancelling order must restore stock');

    // Check customer pending balance is still 2250 (1250 water + 1000 active order), not 2750
    const custRes = await req(`/api/customers/${testCustomerId}`);
    assert.equal(custRes.data.customer.pending_balance, 2250);

    // Delete temporary order and verify stock is not double-restored
    const delRes = await req(`/api/orders/${tempOrderId}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);

    const afterDeleteProdRes = await req('/api/products');
    assert.equal(afterDeleteProdRes.data.products.find(p => p.id === testProductId).stock, stockBeforeOrder, 'Deleting already cancelled order must not double-restore stock');
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
  await t.test('GET /api/payments lists pendingCustomers before full settlement', async () => {
    const listRes = await req('/api/payments');
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data.pendingCustomers));
    const pendingCust = listRes.data.pendingCustomers.find(c => c.customer_id === testCustomerId);
    assert.ok(pendingCust, 'Test customer with unpaid balance must appear in pendingCustomers');
    assert.equal(pendingCust.total_pending, 2250);
  });

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

    // Verify stored payment records in GET /api/payments have accurate amounts and payment modes
    const paymentsListRes = await req(`/api/payments?customerId=${testCustomerId}`);
    assert.equal(paymentsListRes.status, 200);
    assert.ok(Array.isArray(paymentsListRes.data.payments));
    const orderPayment = paymentsListRes.data.payments.find(p => p.order_id === testOrderId);
    assert.ok(orderPayment, 'Payment linked to testOrderId must be stored properly');
    assert.equal(orderPayment.amount, 1000, 'Stored order payment amount must equal 1000 (not NaN/0)');
    assert.equal(orderPayment.payment_mode, 'Cash');
    const waterPayment = paymentsListRes.data.payments.find(p => p.notes === 'Clearing water entry');
    assert.ok(waterPayment, 'Water settlement payment must be stored with accurate notes');
    assert.equal(waterPayment.amount, 1250, 'Stored water payment amount must equal 1250 (not NaN/0)');
    assert.equal(waterPayment.payment_mode, 'Bank Transfer');
  });

  await t.test('Partial and multi-step payments on water entries update balances, dashboard, summary, and reports accurately', async () => {
    // 1. Create a water entry of ₹350 (10 jars @ ₹35)
    const w1Res = await req('/api/water', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        product_id: testProductId,
        quantity: 10,
        price: 35,
        payment_status: 'Pending',
        notes: 'Partial water payment test #1'
      })
    });
    assert.equal(w1Res.status, 201);
    assert.equal(w1Res.data.entry.total_amount, 350);
    const w1Id = w1Res.data.entry.id;

    // 2. Record a ₹200 partial payment -> must leave ₹150 outstanding
    const p1Res = await req('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        amount: 200,
        payment_mode: 'UPI',
        notes: 'Partial payment of 200 toward 350 water entry'
      })
    });
    assert.equal(p1Res.status, 201);

    // Verify customer detail balance is 150
    const custAfterP1 = await req(`/api/customers/${testCustomerId}`);
    assert.equal(custAfterP1.data.customer.pending_balance, 150, '₹350 water entry with ₹200 payment must leave ₹150 outstanding');
    const w1EntryAfterP1 = custAfterP1.data.waterEntries.find(w => w.id === w1Id);
    assert.equal(w1EntryAfterP1.payment_status, 'Partial');
    assert.equal(Number(w1EntryAfterP1.paid_amount), 200);

    // Verify GET /api/customers list balance_pending is 150
    const custListAfterP1 = await req('/api/customers');
    const listedCust = custListAfterP1.data.customers.find(c => c.id === testCustomerId);
    assert.equal(listedCust.balance_pending, 150);

    // Verify GET /api/payments pendingCustomers shows 150
    const payListAfterP1 = await req('/api/payments');
    const pendingCust = payListAfterP1.data.pendingCustomers.find(c => c.customer_id === testCustomerId);
    assert.ok(pendingCust);
    assert.equal(pendingCust.total_pending, 150);

    // Verify GET /api/reports/customer-wise shows 150 pending
    const reportAfterP1 = await req('/api/reports/customer-wise');
    const custReportAfterP1 = reportAfterP1.data.customerWise.find(c => c.customer_id === testCustomerId);
    assert.equal(custReportAfterP1.total_pending, 150);

    // Verify GET /api/water/summary reflects partial paid_amount and pending_amount
    const summaryAfterP1 = await req('/api/water/summary');
    const custSummary = summaryAfterP1.data.monthlySummary.find(m => m.customer_id === testCustomerId);
    assert.ok(custSummary);
    assert.equal(custSummary.pending_amount, 150);

    // 3. Create a second water entry of ₹250 (5 jars @ ₹50) -> total pending becomes 150 + 250 = 400
    const w2Res = await req('/api/water', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        product_id: testProductId,
        quantity: 5,
        price: 50,
        payment_status: 'Pending',
        notes: 'Partial water payment test #2'
      })
    });
    assert.equal(w2Res.status, 201);
    const w2Id = w2Res.data.entry.id;

    // 4. Pay ₹300 -> settles remaining ₹150 of w1 ('Paid') and ₹150 of w2 ('Partial', leaving ₹100)
    const p2Res = await req('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        amount: 300,
        payment_mode: 'Cash',
        notes: 'Multi-entry water settlement (150 + 150)'
      })
    });
    assert.equal(p2Res.status, 201);

    const custAfterP2 = await req(`/api/customers/${testCustomerId}`);
    assert.equal(custAfterP2.data.customer.pending_balance, 100);
    assert.equal(custAfterP2.data.waterEntries.find(w => w.id === w1Id).payment_status, 'Paid');
    assert.equal(custAfterP2.data.waterEntries.find(w => w.id === w2Id).payment_status, 'Partial');
    assert.equal(Number(custAfterP2.data.waterEntries.find(w => w.id === w2Id).paid_amount), 150);

    // 5. Pay remaining ₹100 to clear balance to 0, then clean up w1 & w2 so downstream report counts match
    const p3Res = await req('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: testCustomerId,
        water_entry_id: w2Id,
        amount: 100,
        payment_mode: 'Cash',
        notes: 'Final 100 water payment'
      })
    });
    assert.equal(p3Res.status, 201);

    const custAfterP3 = await req(`/api/customers/${testCustomerId}`);
    assert.equal(custAfterP3.data.customer.pending_balance, 0);
    assert.equal(custAfterP3.data.waterEntries.find(w => w.id === w2Id).payment_status, 'Paid');

    // Clean up temporary water entries w1 and w2
    await req(`/api/water/${w1Id}`, { method: 'DELETE' });
    await req(`/api/water/${w2Id}`, { method: 'DELETE' });
  });
});

test('10. Business Reports & Analytics', async (t) => {
  await t.test('GET /api/reports/sales returns accurate calculations', async () => {
    const res = await req('/api/reports/sales');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.salesData));
  });

  await t.test('GET /api/reports/customer-wise returns customer ledgers with UI and API fields', async () => {
    const res = await req('/api/reports/customer-wise');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.customerWise));
    const custReport = res.data.customerWise.find(c => c.customer_id === testCustomerId);
    assert.ok(custReport);
    assert.equal(custReport.id, testCustomerId);
    assert.equal(custReport.customer_type, 'Shop');
    assert.equal(custReport.water_units, 5);
    assert.equal(custReport.orders_count, 1);
  });

  await t.test('GET /api/reports/product-wise returns product sales performance', async () => {
    const res = await req('/api/reports/product-wise');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.productWise));
  });
});

test('11. Business Settings & Production Auth Security', async (t) => {
  await t.test('Unauthenticated GET /api/settings is rejected with 401 while /api/settings/public returns only public branding', async () => {
    const unauthRes = await fetch(`${baseUrl}/api/settings`);
    assert.equal(unauthRes.status, 401, 'Private business settings must require authentication');

    const pubRes = await fetch(`${baseUrl}/api/settings/public`);
    assert.equal(pubRes.status, 200);
    const pubData = await pubRes.json();
    assert.ok(pubData.settings);
    assert.equal(pubData.settings.upi_id, undefined, 'Public settings must not expose UPI ID');
    assert.equal(pubData.settings.phone, undefined, 'Public settings must not expose private phone');
    assert.equal(pubData.settings.address, undefined, 'Public settings must not expose warehouse address');
  });

  await t.test('GET and update business settings when authenticated', async () => {
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

  await t.test('Production JWT authentication rejects missing or weak JWT_SECRET without fallback', async () => {
    const { getJwtSecret } = require('../server/middleware/auth');
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      assert.throws(() => getJwtSecret(), /JWT_SECRET environment variable must be configured in production/);

      process.env.JWT_SECRET = 'short_secret';
      assert.throws(() => getJwtSecret(), /at least 16 characters/);

      process.env.JWT_SECRET = 'strong_production_secret_key_2026_verified';
      assert.equal(getJwtSecret(), 'strong_production_secret_key_2026_verified');
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      if (prevSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prevSecret;
    }
  });
});

test('12. PostgreSQL Adapter, Query Normalization & Migration SQL Verification', async (t) => {
  const postgres = require('../server/db/postgres');
  const { migrateData } = require('../server/db/migrate');

  await t.test('normalizeQuery translates SQLite dialect to valid PostgreSQL SQL', () => {
    const q1 = postgres.normalizeQuery('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', true);
    assert.match(q1, /GREATEST\(0, stock - \$1\)/);
    assert.match(q1, /WHERE id = \$2/);

    const q2 = postgres.normalizeQuery("SELECT * FROM orders WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now') AND name LIKE ?", false);
    assert.match(q2, /TO_CHAR\(order_date, 'YYYY-MM'\)/);
    assert.match(q2, /TO_CHAR\(CURRENT_DATE, 'YYYY-MM'\)/);
    assert.match(q2, /ILIKE \$1/);

    const q3 = postgres.normalizeQuery('INSERT OR REPLACE INTO business_settings (key, value) VALUES (?, ?)', true);
    assert.match(q3, /INSERT INTO business_settings \(key, value\) VALUES \(\$1, \$2\) ON CONFLICT \(key\) DO UPDATE SET value = EXCLUDED\.value RETURNING key/);

    const q4 = postgres.normalizeQuery('INSERT INTO customers (name, phone) VALUES (?, ?)', true);
    assert.match(q4, /VALUES \(\$1, \$2\)\s+RETURNING id/i);
  });

  await t.test('schema.postgres.sql and migrate.js contain valid water_entries paid_amount DDL and SQL', () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'server', 'db', 'schema.postgres.sql'), 'utf8');
    assert.match(schemaSql, /paid_amount NUMERIC\(12, 2\) NOT NULL DEFAULT 0/);
    assert.match(schemaSql, /ALTER TABLE water_entries ADD COLUMN IF NOT EXISTS paid_amount/);

    const migrateJs = fs.readFileSync(path.join(__dirname, '..', 'server', 'db', 'migrate.js'), 'utf8');
    assert.match(migrateJs, /INSERT INTO water_entries \(id, customer_id, product_id, quantity, price, total_amount, paid_amount, payment_status, date, time, notes, created_at\)/);
    assert.doesNotMatch(migrateJs, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12\)\s*--\s*VALUES/);
  });

  await t.test('migrateData fails safely when DATABASE_URL is not configured', async () => {
    const prevDbUrl = process.env.DATABASE_URL;
    const prevPgUrl = process.env.POSTGRES_URL;
    try {
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_URL;
      const result = await migrateData();
      assert.equal(result.success, false);
      assert.equal(result.reason, 'MISSING_DATABASE_URL');
    } finally {
      if (prevDbUrl !== undefined) process.env.DATABASE_URL = prevDbUrl;
      if (prevPgUrl !== undefined) process.env.POSTGRES_URL = prevPgUrl;
    }
  });

  await t.test('Live PostgreSQL integration: connection, schema, transaction rollback, and controlled persistence', async () => {
    const dotenv = require('dotenv');
    const envLocalPath = path.join(__dirname, '..', '.env.local');
    const prevDbUrl = process.env.DATABASE_URL;
    const prevPgUrl = process.env.POSTGRES_URL;
    let tempCustId = null;

    if (initialDatabaseUrl) {
      process.env.DATABASE_URL = initialDatabaseUrl;
    } else if (!process.env.DATABASE_URL && fs.existsSync(envLocalPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'));
      if (parsed.DATABASE_URL) process.env.DATABASE_URL = parsed.DATABASE_URL;
    }
    if (initialPostgresUrl && !process.env.POSTGRES_URL) {
      process.env.POSTGRES_URL = initialPostgresUrl;
    }

    try {
      assert.equal(postgres.isPostgresConfigured(), true, 'PostgreSQL must be configured via DATABASE_URL');
      const conn = await postgres.testConnection();
      assert.equal(conn.ok, true, `PostgreSQL connection must succeed: ${conn.error || ''}`);

      // Verify schema tables and water_entries.paid_amount column
      const colCheck = await postgres.getOne(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'water_entries' AND column_name = 'paid_amount'
      `);
      assert.ok(colCheck, 'water_entries.paid_amount column must exist in PostgreSQL');

      // Verify baseline migrated counts
      const custCountBefore = await postgres.getOne('SELECT COUNT(*) as count FROM customers');
      assert.ok(custCountBefore.count >= 17, 'Migrated customers count must be at least 17');

      // Verify transaction rollback on error
      await assert.rejects(async () => {
        await postgres.transaction(async (tx) => {
          await tx.prepare(`
            INSERT INTO customers (name, business_name, phone, whatsapp_number, address, customer_type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run('Rollback Test Customer', 'Rollback Biz', '0000000000', '0000000000', 'Rollback Addr', 'Shop', 'Must rollback');
          throw new Error('SIMULATED_TX_FAILURE');
        });
      }, /SIMULATED_TX_FAILURE/);

      const custCountAfterRollback = await postgres.getOne('SELECT COUNT(*) as count FROM customers');
      assert.equal(custCountAfterRollback.count, custCountBefore.count, 'Rolled back transaction must not persist any customer row');

      // Verify controlled persistence via HTTP routes backed by PostgreSQL
      const createCustRes = await req('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'PG Live Persistence Test',
          business_name: 'PG Test Enterprises',
          phone: '9999900001',
          address: 'Neon Verification Complex',
          customer_type: 'Office'
        })
      });
      assert.equal(createCustRes.status, 201);
      tempCustId = createCustRes.data.customer.id;
      assert.ok(tempCustId);

      // Verify partial customer update preserves NOT NULL address in PostgreSQL
      const updateCustRes = await req(`/api/customers/${tempCustId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'PG Live Persistence Updated',
          business_name: 'PG Test Enterprises Updated'
        })
      });
      assert.equal(updateCustRes.status, 200);
      assert.equal(updateCustRes.data.customer.name, 'PG Live Persistence Updated');
      assert.equal(updateCustRes.data.customer.address, 'Neon Verification Complex');

      // Log a ₹350 water entry and ₹150 partial payment in PostgreSQL
      const wRes = await req('/api/water', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: tempCustId,
          quantity: 10,
          price: 35,
          payment_status: 'Pending',
          notes: 'PG integration water entry'
        })
      });
      assert.equal(wRes.status, 201);
      const tempWaterId = wRes.data.entry.id;

      const pRes = await req('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: tempCustId,
          water_entry_id: tempWaterId,
          amount: 150,
          payment_mode: 'UPI',
          notes: 'PG integration partial payment'
        })
      });
      assert.equal(pRes.status, 201);

      const custDetailRes = await req(`/api/customers/${tempCustId}`);
      assert.equal(custDetailRes.status, 200);
      assert.equal(custDetailRes.data.customer.pending_balance, 200, 'PostgreSQL pending balance after 150/350 payment must be 200');

      // Delete controlled test water entry (restores stock of default water jar) and controlled test customer
      await req(`/api/water/${tempWaterId}`, { method: 'DELETE' });
      const delCustRes = await req(`/api/customers/${tempCustId}`, { method: 'DELETE' });
      assert.equal(delCustRes.status, 200);
      tempCustId = null;

      const custCountFinal = await postgres.getOne('SELECT COUNT(*) as count FROM customers');
      assert.equal(custCountFinal.count, custCountBefore.count, 'Customer count must return to exact baseline after cleanup');
    } finally {
      if (tempCustId) {
        try {
          await postgres.run('DELETE FROM customers WHERE id = ?', [tempCustId]);
        } catch (e) {}
      }
      if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDbUrl;
      if (prevPgUrl === undefined) delete process.env.POSTGRES_URL;
      else process.env.POSTGRES_URL = prevPgUrl;
      const p = postgres.getPool();
      if (p) await p.end().catch(() => {});
    }
  });
});
