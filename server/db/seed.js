const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
  console.log('Seeding Ocean Enterprises database...');

  // Check if already seeded
  const userCountRes = await db.prepare('SELECT COUNT(*) as count FROM users').get();
  const userCount = parseInt(userCountRes?.count || 0, 10);
  if (userCount > 0) {
    console.log('Database already has users. Skipping initial seed.');
    return;
  }

  // 1. Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (name, phone, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  await insertUser.run('Ocean Admin', '+91 9876543210', 'admin@ocean.com', passwordHash, 'admin');

  // 2. Business Settings
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO business_settings (key, value)
    VALUES (?, ?)
  `);
  await insertSetting.run('business_name', 'Ocean Enterprises');
  await insertSetting.run('phone', '+91 98765 43210');
  await insertSetting.run('whatsapp', '919876543210');
  await insertSetting.run('email', 'orders@oceanenterprises.com');
  await insertSetting.run('address', 'Muntaha Building, JVLR Road, Jogeshwari (West), Mumbai - 400102');
  await insertSetting.run('upi_id', 'oceanenterprises@okhdfcbank');
  await insertSetting.run('currency', '₹');
  await insertSetting.run('low_stock_threshold', '20');

  // 3. Products
  const products = [
    // Water
    { name: '20L Water Jar', category: 'Water', size: '20L', selling_price: 35, purchase_price: 15, stock: 450, minimum_stock: 50 },
    { name: '1L Packaged Water (Box of 12)', category: 'Water', size: '1L', selling_price: 180, purchase_price: 110, stock: 120, minimum_stock: 25 },
    { name: '500ml Water Bottles (Box of 24)', category: 'Water', size: '500ml', selling_price: 200, purchase_price: 120, stock: 150, minimum_stock: 30 },
    { name: '20L Dispenser Jar with Tap', category: 'Water', size: '20L', selling_price: 120, purchase_price: 70, stock: 45, minimum_stock: 10 },
    // Cold Drinks / Beverages
    { name: 'Frooti 1.2 L', category: 'Beverage', size: '1.2L', selling_price: 70, purchase_price: 52, stock: 95, minimum_stock: 20 },
    { name: 'Frooti 600 ml', category: 'Beverage', size: '600ml', selling_price: 40, purchase_price: 29, stock: 160, minimum_stock: 30 },
    { name: 'Frooti 300 ml', category: 'Beverage', size: '300ml', selling_price: 20, purchase_price: 14, stock: 240, minimum_stock: 40 },
    { name: 'Frooti 160 ml Tetra', category: 'Beverage', size: '160ml', selling_price: 10, purchase_price: 7, stock: 320, minimum_stock: 50 },
    { name: 'Appy Fizz 600 ml', category: 'Beverage', size: '600ml', selling_price: 40, purchase_price: 28, stock: 130, minimum_stock: 25 },
    { name: 'Appy Fizz 250 ml', category: 'Beverage', size: '250ml', selling_price: 20, purchase_price: 14, stock: 180, minimum_stock: 35 },
    { name: 'Thums Up 750 ml', category: 'Beverage', size: '750ml', selling_price: 45, purchase_price: 33, stock: 150, minimum_stock: 30 },
    { name: 'Thums Up 250 ml Can', category: 'Beverage', size: '250ml', selling_price: 25, purchase_price: 17, stock: 210, minimum_stock: 40 },
    { name: 'Litchi Real Fruit Juice 500 ml', category: 'Beverage', size: '500ml', selling_price: 35, purchase_price: 24, stock: 85, minimum_stock: 15 },
    { name: 'Guava Fruit Delight 500 ml', category: 'Beverage', size: '500ml', selling_price: 35, purchase_price: 24, stock: 80, minimum_stock: 15 },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, size, selling_price, purchase_price, stock, minimum_stock, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const productMap = {};
  for (const p of products) {
    const res = await insertProduct.run(p.name, p.category, p.size, p.selling_price, p.purchase_price, p.stock, p.minimum_stock);
    productMap[p.name] = res.lastInsertRowid;
  }

  // 4. Customers
  const customers = [
    {
      name: 'Rajesh Sharma',
      business_name: 'ABC Restaurant',
      phone: '9876543210',
      whatsapp_number: '9876543210',
      address: 'Shop 12, Main Market Road, Near City Clock Tower',
      latitude: 19.0760,
      longitude: 72.8777,
      customer_type: 'Restaurant',
      notes: 'Daily requirement: 5-8 jars of 20L water around 11 AM.'
    },
    {
      name: 'Sunil Mehta',
      business_name: 'Star Bakery & Cafe',
      phone: '9820112233',
      whatsapp_number: '9820112233',
      address: 'Shop #4, Station Road, Opp Central Bus Depot',
      latitude: 19.0820,
      longitude: 72.8810,
      customer_type: 'Shop',
      notes: 'Regular orders of cold drinks + 2 water jars daily.'
    },
    {
      name: 'Ali Charolia',
      business_name: 'Ali Grand Hotel',
      phone: '9819988776',
      whatsapp_number: '9819988776',
      address: 'National Highway 48 Junction, Block B',
      latitude: 19.0910,
      longitude: 72.8690,
      customer_type: 'Hotel',
      notes: 'Large order customer: 15-20 jars water every alternate day.'
    },
    {
      name: 'Pooja Verma',
      business_name: 'Apex Tech Corporate Office',
      phone: '9892334455',
      whatsapp_number: '9892334455',
      address: '4th Floor, Cyber Heights, Sector 3, IT Park',
      latitude: 19.0650,
      longitude: 72.8900,
      customer_type: 'Office',
      notes: 'Monthly billing cycle. Delivers 20L water and 500ml packs.'
    },
    {
      name: 'Mohammed Rizwan',
      business_name: 'Royal Biryani House',
      phone: '9833445566',
      whatsapp_number: '9833445566',
      address: 'Old Bazaar Street, Near Jama Masjid Gate 2',
      latitude: 19.0780,
      longitude: 72.8840,
      customer_type: 'Restaurant',
      notes: 'Evening delivery around 5 PM.'
    },
    {
      name: 'Anjali Deshmukh',
      business_name: 'Deshmukh Residence',
      phone: '9769001122',
      whatsapp_number: '9769001122',
      address: 'Flat 302, Green Heights, Lake View Road',
      latitude: 19.0720,
      longitude: 72.8650,
      customer_type: 'Home',
      notes: 'Delivers 2 jars 20L water every Tuesday and Friday.'
    },
    {
      name: 'Sarbri Manager',
      business_name: 'Hotel Sarbri',
      phone: '9820011001',
      whatsapp_number: '9820011001',
      address: 'Main Bazaar Road, Near City Center',
      latitude: 19.0790,
      longitude: 72.8750,
      customer_type: 'Hotel',
      notes: 'Hotel account - regular 20L water jars and beverages.'
    },
    {
      name: 'Taqwa Management',
      business_name: 'Hotel Taqwa',
      phone: '9820011002',
      whatsapp_number: '9820011002',
      address: 'Station Road, Market Square',
      latitude: 19.0830,
      longitude: 72.8820,
      customer_type: 'Restaurant',
      notes: 'Daily drinking water supply for dining and kitchen.'
    },
    {
      name: 'Al-Hamd Manager',
      business_name: 'Al-Hamd',
      phone: '9820011003',
      whatsapp_number: '9820011003',
      address: 'Bazaar Street, Opp Jama Masjid',
      latitude: 19.0770,
      longitude: 72.8800,
      customer_type: 'Restaurant',
      notes: 'Regular order customer for 20L water jars.'
    },
    {
      name: 'Mervals Management',
      business_name: 'Mervals',
      phone: '9820011004',
      whatsapp_number: '9820011004',
      address: 'Commercial Hub, Block C, Main Avenue',
      latitude: 19.0850,
      longitude: 72.8710,
      customer_type: 'Restaurant',
      notes: 'Water jars and beverage bottles.'
    },
    {
      name: 'Amber Hotel Management',
      business_name: 'Amber Hotel',
      phone: '9820011005',
      whatsapp_number: '9820011005',
      address: 'Highway Junction, Ring Road Circle',
      latitude: 19.0920,
      longitude: 72.8680,
      customer_type: 'Hotel',
      notes: 'Large order hotel account.'
    },
    {
      name: 'Amber Store Incharge',
      business_name: 'Amber Super Market',
      phone: '9820011006',
      whatsapp_number: '9820011006',
      address: 'Main Commercial Market, Ground Floor',
      latitude: 19.0805,
      longitude: 72.8785,
      customer_type: 'Shop',
      notes: 'Super market client - cold drinks crates and water.'
    },
    {
      name: 'Java Kaka',
      business_name: 'Java Kaka',
      phone: '9820011007',
      whatsapp_number: '9820011007',
      address: 'Old Bus Stand, Cross Road Corner',
      latitude: 19.0815,
      longitude: 72.8835,
      customer_type: 'Shop',
      notes: 'Morning fresh water drop.'
    },
    {
      name: 'Imran Bhai',
      business_name: 'Imran Bhai',
      phone: '9820011008',
      whatsapp_number: '9820011008',
      address: 'Residential Colony Market, Lane 3',
      latitude: 19.0740,
      longitude: 72.8670,
      customer_type: 'Shop',
      notes: 'Regular local store supply.'
    },
    {
      name: 'Persia Darbar Management',
      business_name: 'Persia Darbar',
      phone: '9820011009',
      whatsapp_number: '9820011009',
      address: 'Central Highway Link Road',
      latitude: 19.0880,
      longitude: 72.8730,
      customer_type: 'Restaurant',
      notes: 'High volume restaurant client for 20L jars.'
    },
    {
      name: 'Moti Mahal Management',
      business_name: 'Moti Mahal',
      phone: '9820011010',
      whatsapp_number: '9820011010',
      address: 'Grand Trunk Road, Mall Complex Area',
      latitude: 19.0710,
      longitude: 72.8860,
      customer_type: 'Hotel',
      notes: 'Hotel & dining water supplier.'
    },
    {
      name: 'Froodus Management',
      business_name: 'Froodus',
      phone: '9820011011',
      whatsapp_number: '9820011011',
      address: 'New Complex, Sector 2, Plaza Road',
      latitude: 19.0865,
      longitude: 72.8795,
      customer_type: 'Hotel',
      notes: 'Regular water customer.'
    }
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, business_name, phone, whatsapp_number, address, latitude, longitude, customer_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const customerMap = {};
  for (const c of customers) {
    const res = await insertCustomer.run(c.name, c.business_name, c.phone, c.whatsapp_number, c.address, c.latitude, c.longitude, c.customer_type, c.notes);
    customerMap[c.business_name || c.name] = res.lastInsertRowid;
  }

  // 5. Water Entries (Rapid daily water supply records)
  const insertWater = db.prepare(`
    INSERT INTO water_entries (customer_id, product_id, quantity, price, total_amount, payment_status, date, time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const nowTimeStr = new Date().toTimeString().slice(0, 8);
  const daysAgoStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  const waterJarId = productMap['20L Water Jar'];
  await insertWater.run(customerMap['ABC Restaurant'], waterJarId, 6, 35, 210, 'Paid', todayDateStr, nowTimeStr, 'Delivered morning 10:30');
  await insertWater.run(customerMap['Star Bakery & Cafe'], waterJarId, 3, 35, 105, 'Paid', todayDateStr, nowTimeStr, 'Delivered 11:15');
  await insertWater.run(customerMap['Ali Grand Hotel'], waterJarId, 15, 35, 525, 'Pending', todayDateStr, nowTimeStr, 'Monthly payment account');
  await insertWater.run(customerMap['Apex Tech Corporate Office'], waterJarId, 8, 35, 280, 'Pending', todayDateStr, nowTimeStr, 'Office supply');
  await insertWater.run(customerMap['Royal Biryani House'], waterJarId, 5, 35, 175, 'Paid', todayDateStr, nowTimeStr, 'Cash collected');
  await insertWater.run(customerMap['Deshmukh Residence'], waterJarId, 2, 35, 70, 'Paid', todayDateStr, nowTimeStr, 'Home delivery');

  // Also add some yesterday/past entries for monthly summary
  await insertWater.run(customerMap['ABC Restaurant'], waterJarId, 8, 35, 280, 'Paid', daysAgoStr(1), '11:00:00', 'Yesterday supply');
  await insertWater.run(customerMap['ABC Restaurant'], waterJarId, 7, 35, 245, 'Paid', daysAgoStr(3), '11:00:00', 'Regular supply');
  await insertWater.run(customerMap['Star Bakery & Cafe'], waterJarId, 4, 35, 140, 'Paid', daysAgoStr(2), '11:00:00', 'Regular supply');
  await insertWater.run(customerMap['Ali Grand Hotel'], waterJarId, 18, 35, 630, 'Pending', daysAgoStr(4), '11:00:00', 'Bulk supply');

  // 6. Orders & Order Items
  const insertOrder = db.prepare(`
    INSERT INTO orders (order_number, customer_id, total_amount, paid_amount, payment_status, delivery_status, order_date, delivery_address, latitude, longitude, special_instructions, source)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertDelivery = db.prepare(`
    INSERT INTO deliveries (order_id, customer_id, delivery_address, latitude, longitude, status, route_sequence, driver_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Order 1: WhatsApp incoming order for ABC Restaurant
  const ord1 = await insertOrder.run(
    'ORD-2026-001',
    customerMap['ABC Restaurant'],
    490,
    490,
    'Paid',
    'Delivered',
    customers[0].address,
    customers[0].latitude,
    customers[0].longitude,
    'Deliver before lunch crowd at 12 PM',
    'WhatsApp'
  );
  await insertOrderItem.run(ord1.lastInsertRowid, productMap['20L Water Jar'], '20L Water Jar', 4, 35, 140);
  await insertOrderItem.run(ord1.lastInsertRowid, productMap['Thums Up 750 ml'], 'Thums Up 750 ml', 4, 45, 180);
  await insertOrderItem.run(ord1.lastInsertRowid, productMap['Appy Fizz 600 ml'], 'Appy Fizz 600 ml', 3, 40, 120);
  await insertOrderItem.run(ord1.lastInsertRowid, productMap['Frooti 600 ml'], 'Frooti 600 ml', 1, 40, 40);
  await insertDelivery.run(ord1.lastInsertRowid, customerMap['ABC Restaurant'], customers[0].address, customers[0].latitude, customers[0].longitude, 'Delivered', 1, 'Delivered to kitchen manager');

  // Order 2: Out for Delivery for Star Bakery & Cafe
  const ord2 = await insertOrder.run(
    'ORD-2026-002',
    customerMap['Star Bakery & Cafe'],
    390,
    0,
    'Pending',
    'Out for Delivery',
    customers[1].address,
    customers[1].latitude,
    customers[1].longitude,
    'Call Sunil Mehta on arrival',
    'WhatsApp'
  );
  await insertOrderItem.run(ord2.lastInsertRowid, productMap['Frooti 1.2 L'], 'Frooti 1.2 L', 3, 70, 210);
  await insertOrderItem.run(ord2.lastInsertRowid, productMap['Appy Fizz 600 ml'], 'Appy Fizz 600 ml', 3, 40, 120);
  await insertOrderItem.run(ord2.lastInsertRowid, productMap['20L Water Jar'], '20L Water Jar', 2, 35, 70);
  await insertDelivery.run(ord2.lastInsertRowid, customerMap['Star Bakery & Cafe'], customers[1].address, customers[1].latitude, customers[1].longitude, 'Out for Delivery', 2, 'On the way in delivery tempo');

  // Order 3: Preparing for Royal Biryani House
  const ord3 = await insertOrder.run(
    'ORD-2026-003',
    customerMap['Royal Biryani House'],
    575,
    200,
    'Partial',
    'Preparing',
    customers[4].address,
    customers[4].latitude,
    customers[4].longitude,
    'Please send chilled bottles',
    'Manual'
  );
  await insertOrderItem.run(ord3.lastInsertRowid, productMap['Thums Up 750 ml'], 'Thums Up 750 ml', 5, 45, 225);
  await insertOrderItem.run(ord3.lastInsertRowid, productMap['20L Water Jar'], '20L Water Jar', 5, 35, 175);
  await insertOrderItem.run(ord3.lastInsertRowid, productMap['Frooti 300 ml'], 'Frooti 300 ml', 5, 20, 100);
  await insertOrderItem.run(ord3.lastInsertRowid, productMap['Litchi Real Fruit Juice 500 ml'], 'Litchi Real Fruit Juice 500 ml', 2, 35, 75);
  await insertDelivery.run(ord3.lastInsertRowid, customerMap['Royal Biryani House'], customers[4].address, customers[4].latitude, customers[4].longitude, 'Preparing', 3, 'Packing cold drinks crate');

  // Order 4: New Order for Apex Tech Office
  const ord4 = await insertOrder.run(
    'ORD-2026-004',
    customerMap['Apex Tech Corporate Office'],
    800,
    0,
    'Pending',
    'New Order',
    customers[3].address,
    customers[3].latitude,
    customers[3].longitude,
    'Leave at Reception security desk',
    'WhatsApp'
  );
  await insertOrderItem.run(ord4.lastInsertRowid, productMap['500ml Water Bottles (Box of 24)'], '500ml Water Bottles (Box of 24)', 4, 200, 800);
  await insertDelivery.run(ord4.lastInsertRowid, customerMap['Apex Tech Corporate Office'], customers[3].address, customers[3].latitude, customers[3].longitude, 'New Order', 4, 'Awaiting dispatch approval');

  // 7. Payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (customer_id, order_id, water_entry_id, amount, payment_mode, payment_date, status, notes)
    VALUES (?, ?, ?, ?, ?, datetime('now'), 'Completed', ?)
  `);

  await insertPayment.run(customerMap['ABC Restaurant'], ord1.lastInsertRowid, null, 490, 'UPI', 'UPI Ref: 4291882901');
  await insertPayment.run(customerMap['Royal Biryani House'], ord3.lastInsertRowid, null, 200, 'Cash', 'Advance deposit collected');
  await insertPayment.run(customerMap['Deshmukh Residence'], null, 6, 70, 'Cash', 'Water payment on drop');

  console.log('Database seeded successfully with initial data!');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Error during seeding:', err);
  });
}

module.exports = { seed };
