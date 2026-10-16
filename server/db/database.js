const fs = require('fs');
const path = require('path');
const postgres = require('./postgres');

// Determine storage path (supports local development and Vercel serverless environments)
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DATA_FILE = path.join(__dirname, '..', 'data', 'ocean_store.json');

// Static require ensures @vercel/nft traces and bundles the JSON file into the lambda
let initialBundledStore = null;
try {
  initialBundledStore = require('../data/ocean_store.json');
} catch (e) {
  // Ignored if file doesn't exist yet
}

let DATA_DIR;
let DATA_FILE;

if (IS_SERVERLESS) {
  DATA_DIR = '/tmp';
  DATA_FILE = path.join(DATA_DIR, 'ocean_store.json');
  if (!fs.existsSync(DATA_FILE)) {
    if (initialBundledStore) {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialBundledStore, null, 2), 'utf8');
      } catch (err) {
        console.warn('Could not write initial store to /tmp:', err);
      }
    } else if (fs.existsSync(BUNDLED_DATA_FILE)) {
      try {
        fs.copyFileSync(BUNDLED_DATA_FILE, DATA_FILE);
      } catch (err) {
        console.warn('Could not copy bundled store to /tmp:', err);
      }
    }
  }
} else {
  DATA_DIR = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {}
  }
  DATA_FILE = path.join(DATA_DIR, 'ocean_store.json');
}

// Default initial state
const defaultState = {
  users: [],
  customers: [],
  products: [],
  orders: [],
  order_items: [],
  water_entries: [],
  payments: [],
  deliveries: [],
  business_settings: {},
  sequences: {
    users: 0,
    customers: 0,
    products: 0,
    orders: 0,
    order_items: 0,
    water_entries: 0,
    payments: 0,
    deliveries: 0
  }
};

let store = defaultState;

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      store = JSON.parse(data);
    } else if (initialBundledStore) {
      store = JSON.parse(JSON.stringify(initialBundledStore));
      saveStore();
    } else if (fs.existsSync(BUNDLED_DATA_FILE)) {
      const data = fs.readFileSync(BUNDLED_DATA_FILE, 'utf8');
      store = JSON.parse(data);
      saveStore();
    } else {
      store = { ...defaultState };
      saveStore();
    }
    if (!store.sequences) store.sequences = { ...defaultState.sequences };
  } catch (err) {
    console.error('Error loading database store, initializing new:', err);
    store = initialBundledStore ? JSON.parse(JSON.stringify(initialBundledStore)) : { ...defaultState };
    saveStore();
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing database store:', err);
  }
}

loadStore();

// Query engine implementing prepare(sql).get(...), .all(...), .run(...)
class Statement {
  constructor(sql) {
    this.sql = sql.trim();
  }

  run(...rawParams) {
    const params = rawParams.length === 1 && Array.isArray(rawParams[0]) ? rawParams[0] : rawParams;
    if (postgres.isPostgresConfigured()) {
      return postgres.run(this.sql, params);
    }
    const s = this.sql;

    // 1. INSERT INTO users
    if (/^INSERT INTO users/i.test(s)) {
      const id = ++store.sequences.users;
      const [name, phone, email, password_hash, role] = params;
      const user = {
        id,
        name,
        phone,
        email: email ? email.toLowerCase() : null,
        password_hash,
        role: role || 'admin',
        created_at: new Date().toISOString()
      };
      store.users.push(user);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 2. INSERT OR REPLACE INTO business_settings
    if (/^INSERT OR REPLACE INTO business_settings/i.test(s)) {
      const [key, value] = params;
      store.business_settings[key] = value;
      saveStore();
      return { changes: 1 };
    }

    // 3. INSERT INTO products
    if (/^INSERT INTO products/i.test(s)) {
      const id = ++store.sequences.products;
      const [name, category, size, selling_price, purchase_price, stock, minimum_stock] = params;
      const product = {
        id,
        name,
        category,
        size,
        selling_price: Number(selling_price),
        purchase_price: Number(purchase_price),
        stock: Number(stock) || 0,
        minimum_stock: Number(minimum_stock) || 10,
        active: 1,
        created_at: new Date().toISOString()
      };
      store.products.push(product);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 4. UPDATE products SET stock = stock + ? WHERE id = ?
    if (/UPDATE products SET stock = stock \+ \?/i.test(s)) {
      const [qty, id] = params;
      const prod = store.products.find(p => p.id === Number(id));
      if (prod) {
        prod.stock = Math.max(0, (prod.stock || 0) + Number(qty));
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 5. UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
    if (/UPDATE products SET stock = MAX\(0,\s*stock - \?\)/i.test(s)) {
      const [qty, id] = params;
      const prod = store.products.find(p => p.id === Number(id));
      if (prod) {
        prod.stock = Math.max(0, (prod.stock || 0) - Number(qty));
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 6. UPDATE products SET stock = ? WHERE id = ?
    if (/UPDATE products SET stock = \? WHERE id = \?/i.test(s)) {
      const [stock, id] = params;
      const prod = store.products.find(p => p.id === Number(id));
      if (prod) {
        prod.stock = Number(stock);
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 7. General UPDATE products
    if (/^UPDATE products/i.test(s)) {
      if (/SET active = 0 WHERE id = \?/i.test(s)) {
        const prod = store.products.find(p => p.id === Number(params[0]));
        if (prod) {
          prod.active = 0;
          saveStore();
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      // SET name = ?, category = ?, size = ?, selling_price = ?, purchase_price = ?, stock = ?, minimum_stock = ?, active = ? WHERE id = ?
      const [name, category, size, selling_price, purchase_price, stock, minimum_stock, active, id] = params;
      const prod = store.products.find(p => p.id === Number(id));
      if (prod) {
        prod.name = name;
        prod.category = category;
        prod.size = size;
        prod.selling_price = Number(selling_price);
        prod.purchase_price = Number(purchase_price);
        prod.stock = Number(stock);
        prod.minimum_stock = Number(minimum_stock);
        prod.active = Number(active);
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 8. INSERT INTO customers
    if (/^INSERT INTO customers/i.test(s)) {
      const id = ++store.sequences.customers;
      const [name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes] = params;
      const customer = {
        id,
        name,
        business_name: business_name || '',
        phone,
        whatsapp_number: whatsapp_number || phone,
        address,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        customer_type: customer_type || 'Shop',
        notes: notes || '',
        created_at: new Date().toISOString()
      };
      store.customers.push(customer);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 9. UPDATE customers location
    if (/UPDATE customers SET latitude = \?,\s*longitude = \?,\s*address = \?/i.test(s)) {
      const [lat, lng, address, id] = params;
      const c = store.customers.find(item => item.id === Number(id));
      if (c) {
        c.latitude = Number(lat);
        c.longitude = Number(lng);
        c.address = address;
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (/UPDATE customers SET latitude = \?,\s*longitude = \? WHERE id = \?/i.test(s)) {
      const [lat, lng, id] = params;
      const c = store.customers.find(item => item.id === Number(id));
      if (c) {
        c.latitude = Number(lat);
        c.longitude = Number(lng);
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 10. General UPDATE customers
    if (/^UPDATE customers/i.test(s)) {
      const [name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes, id] = params;
      const c = store.customers.find(item => item.id === Number(id));
      if (c) {
        c.name = name;
        c.business_name = business_name;
        c.phone = phone;
        c.whatsapp_number = whatsapp_number;
        c.address = address;
        c.latitude = latitude ? Number(latitude) : null;
        c.longitude = longitude ? Number(longitude) : null;
        c.customer_type = customer_type;
        c.notes = notes;
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 11. DELETE FROM customers
    if (/^DELETE FROM customers WHERE id = \?/i.test(s)) {
      const id = Number(params[0]);
      store.customers = store.customers.filter(c => c.id !== id);
      saveStore();
      return { changes: 1 };
    }

    // 12. INSERT INTO water_entries
    if (/^INSERT INTO water_entries/i.test(s)) {
      const id = ++store.sequences.water_entries;
      let customer_id, product_id, quantity, price, total_amount, payment_status, date, time, notes;
      
      // Check if it's the standard 9-param or date('now') variant
      if (params.length === 9) {
        [customer_id, product_id, quantity, price, total_amount, payment_status, date, time, notes] = params;
      } else if (params.length === 6) {
        // seed format: (customer_id, product_id, quantity, price, total_amount, payment_status, notes)
        [customer_id, product_id, quantity, price, total_amount, payment_status, notes] = params;
        date = new Date().toISOString().slice(0, 10);
        time = new Date().toTimeString().slice(0, 8);
      } else if (params.length === 7) {
        // past water format in seed: (customer_id, product_id, quantity, price, total_amount, payment_status, daysOffset, notes)
        const [cid, pid, q, pr, tot, pstat, offset, n] = params;
        customer_id = cid;
        product_id = pid;
        quantity = q;
        price = pr;
        total_amount = tot;
        payment_status = pstat;
        const days = parseInt(offset, 10) || -1;
        const d = new Date();
        d.setDate(d.getDate() + days);
        date = d.toISOString().slice(0, 10);
        time = '11:00:00';
        notes = n;
      }

      const entry = {
        id,
        customer_id: Number(customer_id),
        product_id: product_id ? Number(product_id) : null,
        quantity: Number(quantity),
        price: Number(price),
        total_amount: Number(total_amount),
        payment_status: payment_status || 'Pending',
        date: date || new Date().toISOString().slice(0, 10),
        time: time || new Date().toTimeString().slice(0, 8),
        notes: notes || '',
        created_at: new Date().toISOString()
      };
      store.water_entries.push(entry);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 13. DELETE FROM water_entries
    if (/^DELETE FROM water_entries WHERE id = \?/i.test(s)) {
      const id = Number(params[0]);
      store.water_entries = store.water_entries.filter(w => w.id !== id);
      saveStore();
      return { changes: 1 };
    }

    // 14. INSERT INTO orders
    if (/^INSERT INTO orders/i.test(s)) {
      const id = ++store.sequences.orders;
      const [order_number, customer_id, total_amount, paid_amount, payment_status, delivery_status, delivery_address, latitude, longitude, special_instructions, source] = params;
      const order = {
        id,
        order_number: order_number || `ORD-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`,
        customer_id: Number(customer_id),
        total_amount: Number(total_amount) || 0,
        paid_amount: Number(paid_amount) || 0,
        payment_status: payment_status || 'Pending',
        delivery_status: delivery_status || 'New Order',
        order_date: new Date().toISOString(),
        delivery_address: delivery_address || '',
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        special_instructions: special_instructions || '',
        source: source || 'Manual',
        created_at: new Date().toISOString()
      };
      store.orders.push(order);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 15. UPDATE orders SET delivery_status = ...
    if (/UPDATE orders SET delivery_status = \?/i.test(s)) {
      const [status, id] = params;
      const ord = store.orders.find(o => o.id === Number(id));
      if (ord) {
        ord.delivery_status = status;
        // Also update delivery table status
        const deliv = store.deliveries.find(d => d.order_id === Number(id));
        if (deliv) {
          deliv.status = status;
          if (status === 'Delivered') deliv.delivered_at = new Date().toISOString();
        }
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 16. UPDATE orders SET payment_status = ...
    if (/UPDATE orders SET payment_status = \?,\s*paid_amount = \?/i.test(s)) {
      const [status, paid, id] = params;
      const ord = store.orders.find(o => o.id === Number(id));
      if (ord) {
        ord.payment_status = status;
        ord.paid_amount = Number(paid);
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 17. INSERT INTO order_items
    if (/^INSERT INTO order_items/i.test(s)) {
      const id = ++store.sequences.order_items;
      const [order_id, product_id, product_name, quantity, price, subtotal] = params;
      const item = {
        id,
        order_id: Number(order_id),
        product_id: Number(product_id),
        product_name,
        quantity: Number(quantity),
        price: Number(price),
        subtotal: Number(subtotal)
      };
      store.order_items.push(item);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 18. INSERT INTO deliveries
    if (/^INSERT INTO deliveries/i.test(s)) {
      const id = ++store.sequences.deliveries;
      const [order_id, customer_id, delivery_address, latitude, longitude, status, route_sequence, driver_notes] = params;
      const delivery = {
        id,
        order_id: Number(order_id),
        customer_id: Number(customer_id),
        delivery_address,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        status: status || 'New Order',
        route_sequence: Number(route_sequence) || 0,
        delivered_at: status === 'Delivered' ? new Date().toISOString() : null,
        driver_notes: driver_notes || '',
        created_at: new Date().toISOString()
      };
      store.deliveries.push(delivery);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 19. UPDATE deliveries route sequence or status
    if (/UPDATE deliveries SET route_sequence = \? WHERE id = \?/i.test(s)) {
      const [seq, id] = params;
      const deliv = store.deliveries.find(d => d.id === Number(id));
      if (deliv) {
        deliv.route_sequence = Number(seq);
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (/UPDATE deliveries SET status =/i.test(s)) {
      const id = Number(params[params.length - 1]);
      const status = params[0];
      const deliv = store.deliveries.find(d => d.id === id);
      if (deliv) {
        deliv.status = status;
        if (params.length > 2 && params[1]) deliv.driver_notes = params[1];
        if (status === 'Delivered') deliv.delivered_at = new Date().toISOString();
        const ord = store.orders.find(o => o.id === deliv.order_id);
        if (ord) ord.delivery_status = status;
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (/UPDATE water_entries SET payment_status =/i.test(s)) {
      const id = Number(params[params.length - 1]);
      const status = params.length === 2 ? params[0] : 'Paid';
      const w = store.water_entries.find(item => item.id === id);
      if (w) {
        w.payment_status = status;
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 20. INSERT INTO payments
    if (/^INSERT INTO payments/i.test(s)) {
      const id = ++store.sequences.payments;
      const [customer_id, order_id, water_entry_id, amount, payment_mode, notes] = params;
      const payment = {
        id,
        customer_id: Number(customer_id),
        order_id: order_id ? Number(order_id) : null,
        water_entry_id: water_entry_id ? Number(water_entry_id) : null,
        amount: Number(amount),
        payment_mode: payment_mode || 'Cash',
        payment_date: new Date().toISOString(),
        status: 'Completed',
        notes: notes || '',
        created_at: new Date().toISOString()
      };
      store.payments.push(payment);
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // 21. DELETE FROM payments
    if (/DELETE FROM payments WHERE water_entry_id = \?/i.test(s)) {
      const id = Number(params[0]);
      store.payments = store.payments.filter(p => p.water_entry_id !== id);
      saveStore();
      return { changes: 1 };
    }

    // 22. UPDATE users SET password_hash = ? WHERE id = ?
    if (/UPDATE users SET password_hash = \? WHERE id = \?/i.test(s)) {
      const [hash, id] = params;
      const u = store.users.find(user => user.id === Number(id));
      if (u) {
        u.password_hash = hash;
        saveStore();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    saveStore();
    return { changes: 1 };
  }

  get(...rawParams) {
    const params = rawParams.length === 1 && Array.isArray(rawParams[0]) ? rawParams[0] : rawParams;
    if (postgres.isPostgresConfigured()) {
      return postgres.getOne(this.sql, params);
    }
    const s = this.sql;

    // COUNT(*) FROM users
    if (/SELECT COUNT\(\*\) as count FROM users/i.test(s)) {
      return { count: store.users.length };
    }

    // SELECT * FROM users WHERE email = ? OR phone = ?
    if (/SELECT \* FROM users\s+WHERE email = \? OR phone = \?/i.test(s)) {
      const [email, phone] = params;
      const u = store.users.find(user => 
        (user.email && user.email.toLowerCase() === (email || '').toLowerCase()) ||
        (user.phone && user.phone === phone)
      );
      return u ? { ...u } : undefined;
    }

    // SELECT ... FROM users WHERE id = ?
    if (/SELECT .* FROM users WHERE id = \?/i.test(s)) {
      const u = store.users.find(user => user.id === Number(params[0]));
      if (!u) return undefined;
      const copy = { ...u };
      delete copy.password_hash;
      return copy;
    }

    // SELECT * FROM customers WHERE id = ?
    if (/SELECT \* FROM customers WHERE id = \?/i.test(s)) {
      const c = store.customers.find(item => item.id === Number(params[0]));
      return c ? { ...c } : undefined;
    }

    // SELECT id, name, business_name, latitude, longitude, address FROM customers WHERE id = ?
    if (/SELECT .* FROM customers WHERE id = \?/i.test(s)) {
      const c = store.customers.find(item => item.id === Number(params[0]));
      return c ? { ...c } : undefined;
    }

    // SELECT * FROM products WHERE id = ?
    if (/SELECT \* FROM products WHERE id = \?/i.test(s)) {
      const p = store.products.find(item => item.id === Number(params[0]));
      return p ? { ...p } : undefined;
    }

    // Default 20L water lookup
    if (/SELECT id, selling_price FROM products WHERE category = 'Water'/i.test(s)) {
      const p = store.products.find(item => item.category === 'Water' && item.name.includes('20L'));
      return p ? { ...p } : store.products.find(item => item.category === 'Water');
    }

    // Total counts / aggregations
    if (/SELECT COUNT\(\*\) as count FROM customers/i.test(s)) {
      return { count: store.customers.length };
    }

    // Today's order count
    if (/SELECT COUNT\(\*\) as count\s+FROM orders\s+WHERE date\(order_date\) = date\('now'\)/i.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const count = store.orders.filter(o => (o.order_date || o.created_at || '').slice(0, 10) === today).length;
      return { count };
    }

    // Water entries today quantity sum
    if (/SELECT COALESCE\(SUM\(quantity\), 0\) as total\s+FROM water_entries\s+WHERE date = date\('now'\)/i.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const total = store.water_entries
        .filter(w => w.date === today)
        .reduce((sum, w) => sum + (w.quantity || 0), 0);
      return { total };
    }

    // Order items water quantity sum today
    if (/SELECT COALESCE\(SUM\(oi\.quantity\), 0\) as total\s+FROM order_items oi/i.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = new Set(store.orders.filter(o => (o.order_date || '').slice(0, 10) === today).map(o => o.id));
      const waterProductIds = new Set(store.products.filter(p => p.category === 'Water' || p.name.includes('Water')).map(p => p.id));
      const total = store.order_items
        .filter(oi => todayOrders.has(oi.order_id) && waterProductIds.has(oi.product_id))
        .reduce((sum, oi) => sum + (oi.quantity || 0), 0);
      return { total };
    }

    // Beverage count today
    if (/SELECT COUNT\(DISTINCT o\.id\) as count\s+FROM orders o.*p\.category = 'Beverage'/is.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const bevProductIds = new Set(store.products.filter(p => p.category === 'Beverage').map(p => p.id));
      const todayOrders = store.orders.filter(o => (o.order_date || '').slice(0, 10) === today);
      const matching = todayOrders.filter(o => store.order_items.some(oi => oi.order_id === o.id && bevProductIds.has(oi.product_id)));
      return { count: matching.length };
    }

    // Beverage units today
    if (/SELECT COALESCE\(SUM\(oi\.quantity\), 0\) as total.*p\.category = 'Beverage'/is.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const bevProductIds = new Set(store.products.filter(p => p.category === 'Beverage').map(p => p.id));
      const todayOrderIds = new Set(store.orders.filter(o => (o.order_date || '').slice(0, 10) === today).map(o => o.id));
      const total = store.order_items
        .filter(oi => todayOrderIds.has(oi.order_id) && bevProductIds.has(oi.product_id))
        .reduce((sum, oi) => sum + (oi.quantity || 0), 0);
      return { total };
    }

    // Pending deliveries
    if (/SELECT COUNT\(\*\) as count\s+FROM orders\s+WHERE delivery_status IN/i.test(s)) {
      const pendingStatuses = ['New Order', 'Confirmed', 'Preparing', 'Out for Delivery'];
      const count = store.orders.filter(o => pendingStatuses.includes(o.delivery_status)).length;
      return { count };
    }

    // Completed deliveries today
    if (/SELECT COUNT\(\*\) as count\s+FROM deliveries\s+WHERE status = 'Delivered'/i.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const count = store.deliveries.filter(d => d.status === 'Delivered' && (d.delivered_at || d.created_at || '').slice(0, 10) === today).length;
      return { count };
    }

    // Pending orders payment total
    if (/SELECT COALESCE\(SUM\(total_amount - paid_amount\), 0\) as total\s+FROM orders\s+WHERE payment_status IN/i.test(s)) {
      const total = store.orders
        .filter(o => o.payment_status === 'Pending' || o.payment_status === 'Partial')
        .reduce((sum, o) => sum + Math.max(0, (o.total_amount || 0) - (o.paid_amount || 0)), 0);
      return { total };
    }

    // Pending water entries total
    if (/SELECT COALESCE\(SUM\(total_amount\), 0\) as total\s+FROM water_entries\s+WHERE payment_status = 'Pending'/i.test(s)) {
      const total = store.water_entries
        .filter(w => w.payment_status === 'Pending')
        .reduce((sum, w) => sum + (w.total_amount || 0), 0);
      return { total };
    }

    // Today order sales
    if (/SELECT COALESCE\(SUM\(total_amount\), 0\) as total\s+FROM orders\s+WHERE date\(order_date\) = date\('now'\)/i.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const total = store.orders
        .filter(o => (o.order_date || '').slice(0, 10) === today && o.delivery_status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);
      return { total };
    }

    // Today water sales
    if (/SELECT COALESCE\(SUM\(total_amount\), 0\) as total\s+FROM water_entries\s+WHERE date = date\('now'\)/i.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const total = store.water_entries
        .filter(w => w.date === today)
        .reduce((sum, w) => sum + (w.total_amount || 0), 0);
      return { total };
    }

    // Monthly order sales
    if (/SELECT COALESCE\(SUM\(total_amount\), 0\) as total\s+FROM orders\s+WHERE strftime\('%Y-%m', order_date\)/i.test(s)) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const total = store.orders
        .filter(o => (o.order_date || '').slice(0, 7) === thisMonth && o.delivery_status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);
      return { total };
    }

    // Monthly water sales
    if (/SELECT COALESCE\(SUM\(total_amount\), 0\) as total\s+FROM water_entries\s+WHERE strftime\('%Y-%m', date\)/i.test(s)) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const total = store.water_entries
        .filter(w => (w.date || '').slice(0, 7) === thisMonth)
        .reduce((sum, w) => sum + (w.total_amount || 0), 0);
      return { total };
    }

    // Specific water entry
    if (/SELECT \* FROM water_entries WHERE id = \?/i.test(s)) {
      const w = store.water_entries.find(item => item.id === Number(params[0]));
      return w ? { ...w } : undefined;
    }

    // Water entry with customer details
    if (/SELECT w\.\*, c\.name as customer_name.*FROM water_entries w/is.test(s)) {
      const w = store.water_entries.find(item => item.id === Number(params[0]));
      if (!w) return undefined;
      const c = store.customers.find(item => item.id === w.customer_id) || {};
      return {
        ...w,
        customer_name: c.name || '',
        business_name: c.business_name || '',
        customer_phone: c.phone || '',
        customer_address: c.address || ''
      };
    }

    // Today water summary stats
    if (/SELECT\s+COALESCE\(SUM\(quantity\), 0\) as total_units.*FROM water_entries.*WHERE date = date\('now'\)/is.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const entries = store.water_entries.filter(w => w.date === today);
      const total_units = entries.reduce((acc, w) => acc + (w.quantity || 0), 0);
      const total_amount = entries.reduce((acc, w) => acc + (w.total_amount || 0), 0);
      const uniqueCust = new Set(entries.map(w => w.customer_id)).size;
      return { total_units, total_amount, total_customers_served: uniqueCust };
    }

    // Customer balance calculation
    if (/SELECT\s+COALESCE\(\(SELECT SUM\(total_amount - paid_amount\).*as pending/is.test(s)) {
      const custId = Number(params[0]);
      const orderPending = store.orders
        .filter(o => o.customer_id === custId && o.payment_status !== 'Paid')
        .reduce((acc, o) => acc + Math.max(0, (o.total_amount || 0) - (o.paid_amount || 0)), 0);
      const waterPending = store.water_entries
        .filter(w => w.customer_id === custId && w.payment_status === 'Pending')
        .reduce((acc, w) => acc + (w.total_amount || 0), 0);
      return { pending: orderPending + waterPending };
    }

    // Units sold stats for a product
    if (/SELECT COALESCE\(SUM\(quantity\), 0\) as total_sold FROM order_items oi/i.test(s)) {
      const prodId = Number(params[0]);
      const total_sold = store.order_items
        .filter(oi => oi.product_id === prodId)
        .reduce((acc, oi) => acc + (oi.quantity || 0), 0);
      return { total_sold };
    }

    // Water sold stats for product
    if (/SELECT COALESCE\(SUM\(quantity\), 0\) as total_water_sold FROM water_entries/i.test(s)) {
      const prodId = Number(params[0]);
      const total_water_sold = store.water_entries
        .filter(w => w.product_id === prodId)
        .reduce((acc, w) => acc + (w.quantity || 0), 0);
      return { total_water_sold };
    }

    // Specific order lookup (supports both direct and joined queries)
    if (/FROM orders/i.test(s) && /WHERE (?:o\.)?id = \?/i.test(s)) {
      const ord = store.orders.find(o => o.id === Number(params[0]));
      if (!ord) return undefined;
      const c = store.customers.find(item => item.id === ord.customer_id) || {};
      return {
        ...ord,
        customer_name: c.name || '',
        business_name: c.business_name || '',
        customer_phone: c.phone || '',
        customer_whatsapp: c.whatsapp_number || c.phone || '',
        customer_address: c.address || ''
      };
    }

    // Delivery lookup by ID or order_id
    if (/FROM deliveries/i.test(s) && /WHERE (?:d\.)?id = \?/i.test(s)) {
      const d = store.deliveries.find(item => item.id === Number(params[0]));
      return d ? { ...d } : undefined;
    }
    if (/FROM deliveries/i.test(s) && /WHERE (?:d\.)?order_id = \?/i.test(s)) {
      const d = store.deliveries.find(item => item.order_id === Number(params[0]));
      return d ? { ...d } : undefined;
    }

    return undefined;
  }

  all(...rawParams) {
    const params = rawParams.length === 1 && Array.isArray(rawParams[0]) ? rawParams[0] : rawParams;
    if (postgres.isPostgresConfigured()) {
      return postgres.getAll(this.sql, params);
    }
    const s = this.sql;

    // 1. Customers listing
    if (/FROM customers c/i.test(s)) {
      let list = [...store.customers];
      
      // Check for type filter
      if (/c\.customer_type = \?/i.test(s)) {
        const typeParam = params.find(p => ['Shop', 'Restaurant', 'Office', 'Hotel', 'Home', 'Other'].includes(p));
        if (typeParam) list = list.filter(c => c.customer_type === typeParam);
      }

      // Check for search filter
      if (/c\.name LIKE \?/i.test(s)) {
        const searchRaw = params.find(p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
        if (searchRaw) {
          const term = searchRaw.slice(1, -1).toLowerCase();
          list = list.filter(c => 
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.business_name && c.business_name.toLowerCase().includes(term)) ||
            (c.phone && c.phone.includes(term)) ||
            (c.address && c.address.toLowerCase().includes(term))
          );
        }
      }

      return list.map(c => {
        const custOrders = store.orders.filter(o => o.customer_id === c.id && o.delivery_status !== 'Cancelled');
        const custWater = store.water_entries.filter(w => w.customer_id === c.id);

        const total_orders = custOrders.length;
        const totalOrderSales = custOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
        const totalWaterSales = custWater.reduce((acc, w) => acc + (w.total_amount || 0), 0);
        const total_amount = totalOrderSales + totalWaterSales;

        const orderPending = store.orders
          .filter(o => o.customer_id === c.id && o.payment_status !== 'Paid')
          .reduce((acc, o) => acc + Math.max(0, (o.total_amount || 0) - (o.paid_amount || 0)), 0);
        const waterPending = custWater
          .filter(w => w.payment_status === 'Pending')
          .reduce((acc, w) => acc + (w.total_amount || 0), 0);
        const balance_pending = orderPending + waterPending;

        const lastOrder = custOrders.sort((a, b) => (b.order_date || '').localeCompare(a.order_date || ''))[0];
        const lastWater = custWater.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

        return {
          ...c,
          total_orders,
          total_amount,
          balance_pending,
          last_order_date: lastOrder ? lastOrder.order_date : null,
          last_water_date: lastWater ? lastWater.date : null
        };
      });
    }

    // 2. Products listing
    if (/SELECT \* FROM products/i.test(s)) {
      let list = [...store.products];
      if (/category = \?/i.test(s)) {
        const cat = params[0];
        list = list.filter(p => p.category === cat);
      }
      if (/active = 1/i.test(s)) {
        list = list.filter(p => p.active === 1);
      }
      if (/stock <= minimum_stock/i.test(s)) {
        list = list.filter(p => p.stock <= p.minimum_stock);
      }
      return list;
    }

    // 3. Low stock products
    if (/SELECT id, name, category, size, stock, minimum_stock\s+FROM products\s+WHERE stock <= minimum_stock/i.test(s)) {
      return store.products.filter(p => p.active === 1 && p.stock <= p.minimum_stock);
    }

    // 4. Water entries listing
    if (/FROM water_entries w/i.test(s)) {
      let list = [...store.water_entries];

      // Filters
      if (/w\.date = \?/i.test(s)) {
        const d = params[0];
        list = list.filter(w => w.date === d);
      }
      if (/w\.customer_id = \?/i.test(s)) {
        const cid = Number(params[0]);
        list = list.filter(w => w.customer_id === cid);
      }
      if (/strftime\('%Y-%m', w\.date\) = \?/i.test(s)) {
        const m = params[0];
        list = list.filter(w => (w.date || '').slice(0, 7) === m);
      }

      list.sort((a, b) => (b.date + ' ' + (b.time || '')).localeCompare(a.date + ' ' + (a.time || '')));

      return list.map(w => {
        const cust = store.customers.find(c => c.id === w.customer_id) || {};
        const prod = store.products.find(p => p.id === w.product_id) || {};
        return {
          ...w,
          customer_name: cust.name || '',
          business_name: cust.business_name || '',
          customer_phone: cust.phone || '',
          customer_address: cust.address || '',
          product_name: prod.name || '20L Water Jar',
          product_size: prod.size || '20L'
        };
      });
    }

    // 5. Customer monthly water summary
    if (/SELECT\s+c\.id as customer_id.*FROM customers c\s+JOIN water_entries w/is.test(s)) {
      const month = params[0] || new Date().toISOString().slice(0, 7);
      const entries = store.water_entries.filter(w => (w.date || '').slice(0, 7) === month);

      const grouped = {};
      for (const w of entries) {
        if (!grouped[w.customer_id]) {
          const c = store.customers.find(cust => cust.id === w.customer_id) || {};
          grouped[w.customer_id] = {
            customer_id: c.id,
            customer_name: c.name || '',
            business_name: c.business_name || '',
            customer_phone: c.phone || '',
            address: c.address || '',
            total_water_units: 0,
            total_amount: 0,
            paid_amount: 0,
            pending_amount: 0,
            delivery_days: new Set(),
            last_water_date: ''
          };
        }
        const g = grouped[w.customer_id];
        g.total_water_units += w.quantity || 0;
        g.total_amount += w.total_amount || 0;
        if (w.payment_status === 'Paid') g.paid_amount += w.total_amount || 0;
        else g.pending_amount += w.total_amount || 0;
        g.delivery_days.add(w.date);
        if (!g.last_water_date || w.date > g.last_water_date) g.last_water_date = w.date;
      }

      return Object.values(grouped).map(g => ({
        ...g,
        delivery_days: g.delivery_days.size
      })).sort((a, b) => b.total_water_units - a.total_water_units);
    }

    // 6. Recent orders preview
    if (/FROM orders o\s+JOIN customers c.*LIMIT/is.test(s)) {
      const sorted = [...store.orders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 6);
      return sorted.map(o => {
        const c = store.customers.find(cust => cust.id === o.customer_id) || {};
        return {
          ...o,
          customer_name: c.name || '',
          business_name: c.business_name || '',
          customer_phone: c.phone || ''
        };
      });
    }

    // 7. Delivery status breakdown
    if (/SELECT delivery_status, COUNT\(\*\) as count\s+FROM orders/i.test(s)) {
      const today = new Date().toISOString().slice(0, 10);
      const counts = {};
      store.orders.filter(o => (o.order_date || '').slice(0, 10) === today).forEach(o => {
        counts[o.delivery_status] = (counts[o.delivery_status] || 0) + 1;
      });
      return Object.entries(counts).map(([delivery_status, count]) => ({ delivery_status, count }));
    }

    // 8. Orders for specific customer
    if (/FROM orders o.*WHERE o\.customer_id = \?/is.test(s)) {
      const custId = Number(params[0]);
      const list = store.orders.filter(o => o.customer_id === custId).sort((a, b) => (b.order_date || '').localeCompare(a.order_date || ''));
      return list.map(o => {
        const items = store.order_items.filter(oi => oi.order_id === o.id);
        return {
          ...o,
          items: JSON.stringify(items)
        };
      });
    }

    // 9. Payments for specific customer
    if (/SELECT \* FROM payments\s+WHERE customer_id = \?/i.test(s)) {
      const custId = Number(params[0]);
      return store.payments.filter(p => p.customer_id === custId).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
    }

    // 10. Customer monthly stats breakdown
    if (/FROM \(\s*-- Water entries/is.test(s)) {
      const custId = Number(params[0]);
      const months = {};
      
      store.water_entries.filter(w => w.customer_id === custId).forEach(w => {
        const m = (w.date || '').slice(0, 7);
        if (!months[m]) months[m] = { month: m, total_water_units: 0, total_orders: 0, total_sales: 0, total_paid: 0, total_pending: 0 };
        months[m].total_water_units += w.quantity || 0;
        months[m].total_sales += w.total_amount || 0;
        if (w.payment_status === 'Paid') months[m].total_paid += w.total_amount || 0;
        else months[m].total_pending += w.total_amount || 0;
      });

      store.orders.filter(o => o.customer_id === custId && o.delivery_status !== 'Cancelled').forEach(o => {
        const m = (o.order_date || '').slice(0, 7);
        if (!months[m]) months[m] = { month: m, total_water_units: 0, total_orders: 0, total_sales: 0, total_paid: 0, total_pending: 0 };
        months[m].total_orders += 1;
        months[m].total_sales += o.total_amount || 0;
        months[m].total_paid += o.paid_amount || 0;
        months[m].total_pending += Math.max(0, (o.total_amount || 0) - (o.paid_amount || 0));
      });

      return Object.values(months).sort((a, b) => b.month.localeCompare(a.month));
    }

    // 11. Deliveries list
    if (/FROM deliveries d/i.test(s)) {
      let list = [...store.deliveries];
      list.sort((a, b) => (a.route_sequence || 0) - (b.route_sequence || 0));
      return list.map(d => {
        const c = store.customers.find(cust => cust.id === d.customer_id) || {};
        const o = store.orders.find(ord => ord.id === d.order_id) || {};
        const items = store.order_items.filter(oi => oi.order_id === d.order_id);
        return {
          ...d,
          customer_name: c.name || '',
          business_name: c.business_name || '',
          customer_phone: c.phone || '',
          customer_whatsapp: c.whatsapp_number || c.phone || '',
          total_amount: o.total_amount || 0,
          paid_amount: o.paid_amount || 0,
          payment_status: o.payment_status || 'Pending',
          order_number: o.order_number || '',
          order_items: items,
          special_instructions: o.special_instructions || ''
        };
      });
    }

    // Default return all for raw table requests
    if (/FROM users/i.test(s)) return [...store.users];
    if (/FROM customers/i.test(s)) return [...store.customers];
    if (/FROM products/i.test(s)) return [...store.products];
    if (/FROM orders/i.test(s)) {
      let list = [...store.orders];
      if (/WHERE customer_id = \?/i.test(s)) {
        list = list.filter(o => o.customer_id === Number(params[0]));
      }
      if (/payment_status != 'Paid'/i.test(s)) {
        list = list.filter(o => o.payment_status !== 'Paid');
      }
      if (/delivery_status != 'Cancelled'/i.test(s)) {
        list = list.filter(o => o.delivery_status !== 'Cancelled');
      }
      return list;
    }
    if (/FROM order_items/i.test(s)) {
      if (/WHERE order_id = \?/i.test(s)) {
        return store.order_items.filter(oi => oi.order_id === Number(params[0]));
      }
      return [...store.order_items];
    }
    if (/FROM water_entries/i.test(s)) {
      let list = [...store.water_entries];
      if (/WHERE customer_id = \?/i.test(s)) {
        list = list.filter(w => w.customer_id === Number(params[0]));
      }
      if (/payment_status = 'Pending'/i.test(s)) {
        list = list.filter(w => w.payment_status === 'Pending');
      }
      return list;
    }
    if (/FROM deliveries/i.test(s)) return [...store.deliveries];
    if (/FROM payments/i.test(s)) return [...store.payments];
    if (/FROM business_settings/i.test(s)) {
      return Object.entries(store.business_settings || {}).map(([key, value]) => ({ key, value }));
    }

    return [];
  }
}

const db = {
  prepare(sql) {
    return new Statement(sql);
  },
  exec(sql) {
    if (postgres.isPostgresConfigured()) {
      return postgres.query(sql);
    }
    return true;
  },
  pragma(setting) {
    return true;
  },
  transaction(callback) {
    if (postgres.isPostgresConfigured()) {
      return postgres.transaction(callback);
    }
    return callback(this);
  },
  _getStore() {
    return store;
  },
  _save() {
    saveStore();
  }
};

module.exports = db;
