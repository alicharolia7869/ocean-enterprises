-- =============================================================================
-- Ocean Enterprises — PostgreSQL Relational Schema
-- Compatible with Neon, Supabase, AWS RDS, and Standard PostgreSQL
-- =============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  whatsapp_number VARCHAR(50),
  address TEXT NOT NULL,
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  customer_type VARCHAR(50) DEFAULT 'Shop',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_name);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);

-- 3. Products & Inventory Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  size VARCHAR(50) NOT NULL,
  selling_price NUMERIC(12, 2) NOT NULL,
  purchase_price NUMERIC(12, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 10,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'Pending',
  delivery_status VARCHAR(50) DEFAULT 'New Order',
  order_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  delivery_address TEXT,
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  special_instructions TEXT,
  source VARCHAR(50) DEFAULT 'Manual',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 6. Rapid Water Entries Table
CREATE TABLE IF NOT EXISTS water_entries (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'Pending',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_water_customer ON water_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_date ON water_entries(date);
CREATE INDEX IF NOT EXISTS idx_water_payment ON water_entries(payment_status);

-- 7. Payments & Financial Ledger Table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  water_entry_id INTEGER REFERENCES water_entries(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
  payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'Completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- 8. Deliveries & Route Dispatch Table
CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  delivery_address TEXT NOT NULL,
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  status VARCHAR(50) DEFAULT 'New Order',
  route_sequence INTEGER DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  driver_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_sequence ON deliveries(route_sequence);

-- 9. Business Settings Key-Value Table
CREATE TABLE IF NOT EXISTS business_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT
);

-- Non-destructive migration for partial water payment tracking on existing databases
ALTER TABLE water_entries ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
UPDATE water_entries SET paid_amount = total_amount WHERE payment_status = 'Paid' AND paid_amount = 0;
