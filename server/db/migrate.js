const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { isPostgresConfigured, getPool, runMigrations, transaction } = require('./postgres');

async function migrateData() {
  console.log('----------------------------------------------------');
  console.log('🌊 Ocean Enterprises — Database Migration Engine');
  console.log('----------------------------------------------------');

  if (!isPostgresConfigured()) {
    console.error('❌ DATABASE_URL is not set or not a valid PostgreSQL URL.');
    console.error('Please configure DATABASE_URL in your .env file or environment variables.');
    return { success: false, reason: 'MISSING_DATABASE_URL' };
  }

  const pool = getPool();

  // 1. Step 1: Run Schema DDL
  console.log('1️⃣ Running schema migrations...');
  await runMigrations();

  // 2. Step 2: Load Source JSON Data
  const jsonPath = path.join(__dirname, '..', 'data', 'ocean_store.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️ Source store not found at ${jsonPath}. Skipping data import.`);
    return { success: true, imported: false };
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const store = JSON.parse(raw);

  const counts = {
    users: store.users?.length || 0,
    customers: store.customers?.length || 0,
    products: store.products?.length || 0,
    orders: store.orders?.length || 0,
    order_items: store.order_items?.length || 0,
    water_entries: store.water_entries?.length || 0,
    payments: store.payments?.length || 0,
    deliveries: store.deliveries?.length || 0
  };

  console.log('2️⃣ Source JSON Records to migrate:');
  console.table(counts);

  // 3. Step 3: Run Data Migration inside a single atomic Transaction
  console.log('3️⃣ Migrating data into PostgreSQL...');
  await transaction(async (client) => {
    // 3a. Settings
    if (store.business_settings) {
      for (const [key, value] of Object.entries(store.business_settings)) {
        await client.query(
          `INSERT INTO business_settings (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, String(value)]
        );
      }
    }

    // 3b. Users
    for (const u of store.users || []) {
      await client.query(
        `INSERT INTO users (id, name, phone, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING`,
        [u.id, u.name, u.phone, (u.email || '').toLowerCase(), u.password_hash, u.role || 'admin', u.created_at || new Date()]
      );
    }

    // 3c. Customers
    for (const c of store.customers || []) {
      await client.query(
        `INSERT INTO customers (id, name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.business_name || '', c.phone, c.whatsapp_number || c.phone, c.address, c.latitude || null, c.longitude || null, c.customer_type || 'Shop', c.notes || '', c.created_at || new Date()]
      );
    }

    // 3d. Products
    for (const p of store.products || []) {
      await client.query(
        `INSERT INTO products (id, name, category, size, selling_price, purchase_price, stock, minimum_stock, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.category, p.size, p.selling_price, p.purchase_price, p.stock || 0, p.minimum_stock || 10, p.active !== undefined ? p.active : 1, p.created_at || new Date()]
      );
    }

    // 3e. Orders
    for (const o of store.orders || []) {
      await client.query(
        `INSERT INTO orders (id, order_number, customer_id, total_amount, paid_amount, payment_status, delivery_status, order_date, delivery_address, latitude, longitude, special_instructions, source, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.order_number, o.customer_id, o.total_amount || 0, o.paid_amount || 0, o.payment_status || 'Pending', o.delivery_status || 'New Order', o.order_date || o.created_at || new Date(), o.delivery_address || '', o.latitude || null, o.longitude || null, o.special_instructions || '', o.source || 'Manual', o.created_at || new Date()]
      );
    }

    // 3f. Order Items
    for (const oi of store.order_items || []) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [oi.id, oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.price, oi.subtotal]
      );
    }

    // 3g. Water Entries
    for (const w of store.water_entries || []) {
      if (!w.customer_id || !w.quantity || w.quantity <= 0) continue;
      await client.query(
        `INSERT INTO water_entries (id, customer_id, product_id, quantity, price, total_amount, paid_amount, payment_status, date, time, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          w.id,
          w.customer_id,
          w.product_id || null,
          w.quantity,
          w.price ?? 0,
          w.total_amount ?? 0,
          w.paid_amount !== undefined ? w.paid_amount : (w.payment_status === 'Paid' ? (w.total_amount ?? 0) : 0),
          w.payment_status || 'Pending',
          w.date,
          w.time || '',
          w.notes || '',
          w.created_at || new Date()
        ]
      );
    }

    // 3h. Payments
    for (const py of store.payments || []) {
      await client.query(
        `INSERT INTO payments (id, customer_id, order_id, water_entry_id, amount, payment_mode, payment_date, status, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [py.id, py.customer_id, py.order_id || null, py.water_entry_id || null, py.amount, py.payment_mode || 'Cash', py.payment_date || py.created_at || new Date(), py.status || 'Completed', py.notes || '', py.created_at || new Date()]
      );
    }

    // 3i. Deliveries
    for (const d of store.deliveries || []) {
      await client.query(
        `INSERT INTO deliveries (id, order_id, customer_id, delivery_address, latitude, longitude, status, route_sequence, delivered_at, driver_notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, d.order_id, d.customer_id, d.delivery_address || '', d.latitude || null, d.longitude || null, d.status || 'New Order', d.route_sequence || 0, d.delivered_at || null, d.driver_notes || '', d.created_at || new Date()]
      );
    }

    // 4. Update sequence counters so new records get proper incrementing IDs
    const tables = ['users', 'customers', 'products', 'orders', 'order_items', 'water_entries', 'payments', 'deliveries'];
    for (const t of tables) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`);
    }
  });

  // 5. Validate migrated records in PostgreSQL
  console.log('4️⃣ Validating PostgreSQL records...');
  const validation = {};
  const tables = ['users', 'customers', 'products', 'orders', 'order_items', 'water_entries', 'payments', 'deliveries'];
  for (const t of tables) {
    const res = await pool.query(`SELECT COUNT(*) as count FROM ${t}`);
    validation[t] = parseInt(res.rows[0].count, 10);
  }
  console.table(validation);
  console.log('✅ Migration to PostgreSQL completed successfully!');
  return { success: true, validation };
}

if (require.main === module) {
  migrateData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateData };
