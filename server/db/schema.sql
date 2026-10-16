-- Ocean Enterprises Database Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT NOT NULL,
  whatsapp_number TEXT,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  customer_type TEXT DEFAULT 'Shop', -- Shop, Restaurant, Office, Hotel, Home, Other
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_name);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Water', 'Beverage'
  size TEXT NOT NULL,
  selling_price REAL NOT NULL,
  purchase_price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 10,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE,
  customer_id INTEGER NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending', -- 'Paid', 'Partial', 'Pending'
  delivery_status TEXT DEFAULT 'New Order', -- 'New Order', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivery_address TEXT,
  latitude REAL,
  longitude REAL,
  special_instructions TEXT,
  source TEXT DEFAULT 'Manual', -- 'Manual', 'WhatsApp'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS water_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  product_id INTEGER,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  total_amount REAL NOT NULL,
  payment_status TEXT DEFAULT 'Pending', -- 'Paid', 'Pending'
  date DATE NOT NULL,
  time TIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_water_customer ON water_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_date ON water_entries(date);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  order_id INTEGER,
  water_entry_id INTEGER,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash', -- 'Cash', 'UPI', 'Bank Transfer', 'Other'
  payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'Completed',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (water_entry_id) REFERENCES water_entries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  delivery_address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  status TEXT DEFAULT 'New Order', -- 'New Order', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'
  route_sequence INTEGER DEFAULT 0,
  delivered_at DATETIME,
  driver_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

CREATE TABLE IF NOT EXISTS business_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
