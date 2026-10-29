# REST API Reference

This document provides the complete, code-verified API reference for the **Ocean Enterprises Business Management System**.

- **Base URL (Production)**: `https://ocean-enterprises.vercel.app/api`
- **Base URL (Local Server)**: `http://localhost:5000/api`
- **Content-Type**: `application/json`
- **Authentication**: Protected endpoints require the HTTP header:
  ```http
  Authorization: Bearer <jwt_token>
  ```

> **Note on Vercel Route Mounting**: In [`api/index.js`](../api/index.js), all routers are mounted at both `/api/<resource>` and `/<resource>`. Standard frontend requests always use the `/api/<resource>` prefix via [`client/src/services/api.js`](../client/src/services/api.js).

---

## 1. System Health Endpoints (`api/index.js`, `server/index.js`)

### `GET /api/health` (Alias: `GET /health`)
Returns system status, storage mode, and live PostgreSQL connectivity check.
- **Authentication**: None (Public)
- **Implementation**: [`api/index.js`](../api/index.js), [`server/index.js`](../server/index.js)
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "online",
    "system": "Ocean Enterprises Business Management System API (Vercel Serverless)",
    "storage": "postgresql",
    "database_configured": true,
    "database_connected": true,
    "database": "connected",
    "persistent": true,
    "timestamp": "2026-10-28T12:44:07.232Z"
  }
  ```
  *(If `DATABASE_URL` is configured but the database query fails, `status` is `"degraded"`, `database_connected` is `false`, and `persistent` is `false`.)*

---

## 2. Authentication (`server/routes/auth.js`)

### `POST /api/auth/login`
Authenticates an operator/admin using email, phone number (exact or 10-digit normalized), or account name (`Ocean Admin` / `admin`) and returns a 30-day JWT.
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "emailOrPhone": "admin@ocean.com",
    "password": "your_password"
  }
  ```
  *(Also accepts `email`, `phone`, or `username` in place of `emailOrPhone`.)*
- **Responses**:
  - `200 OK`: `{ "message": "Login successful", "token": "<jwt>", "user": { "id": 1, "name": "Ocean Admin", "email": "admin@ocean.com", "phone": "+91 9876543210", "role": "admin" } }`
  - `400 Bad Request`: `{ "error": "Email/phone and password are required" }`
  - `401 Unauthorized`: `{ "error": "Invalid credentials. Please check your email/phone." }` or `{ "error": "Invalid password. Please try again." }`
  - `503 Service Unavailable`: `{ "error": "Authentication service is not configured. Please set a strong JWT_SECRET in production." }`

### `GET /api/auth/me`
Returns the profile of the currently authenticated user.
- **Authentication**: Required (`authMiddleware`)
- **Responses**:
  - `200 OK`: `{ "user": { "id": 1, "name": "Ocean Admin", "email": "admin@ocean.com", "phone": "+91 9876543210", "role": "admin", "created_at": "..." } }`
  - `401 Unauthorized`: Missing, malformed, or expired Bearer token.
  - `404 Not Found`: `{ "error": "User not found" }`

### `POST /api/auth/change-password` (Alias: `PUT /api/auth/change-password`)
Verifies the user's current password and updates `users.password_hash`.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  ```json
  {
    "currentPassword": "old_password",
    "newPassword": "new_password_min_6_chars"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "message": "Password updated successfully" }`
  - `400 Bad Request`: `{ "error": "New password must be at least 6 characters long" }` or `{ "error": "Current password does not match" }`
  - `404 Not Found`: `{ "error": "User not found" }`

---

## 3. Dashboard (`server/routes/dashboard.js`)

### `GET /api/dashboard/stats`
Returns aggregated real-time operational KPIs, dispatch breakdown, low-stock alerts, and recent orders.
- **Authentication**: Required (`authMiddleware`)
- **Success Response (`200 OK`)**:
  ```json
  {
    "summary": {
      "today_revenue": 0,
      "month_revenue": 16820,
      "total_pending": 4990
    },
    "todayOrdersCount": 0,
    "todayWaterQuantity": 0,
    "todayBeverageOrdersCount": 0,
    "todayBeverageUnits": 0,
    "pendingDeliveries": 6,
    "completedDeliveriesToday": 0,
    "totalPendingAmount": 4990,
    "todayTotalSales": 0,
    "monthlySales": 16820,
    "totalCustomers": 17,
    "lowStockProducts": [],
    "low_stock": [],
    "recentOrders": [],
    "recent_orders": [],
    "pending_payments": [],
    "deliveryBreakdown": [
      { "delivery_status": "New Order", "count": 4 },
      { "delivery_status": "Out for Delivery", "count": 1 },
      { "delivery_status": "Preparing", "count": 1 }
    ]
  }
  ```

---

## 4. Customers (`server/routes/customers.js`)

### `GET /api/customers`
Lists all customers with computed `total_orders`, `total_amount`, `balance_pending`, `payment_status`, and `last_active_date`.
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `type` *(optional)*: `'All'`, `'Restaurant'`, `'Office'`, `'Shop'`, or `'Residential'`.
  - `search` *(optional)*: Case-insensitive substring filter across `name`, `business_name`, `phone`, and `address`.
- **Success Response (`200 OK`)**: `{ "customers": [ ... ] }`

### `GET /api/customers/:id`
Returns a single customer's profile along with their complete `orders` (with `items`), `waterEntries` (with `paid_amount` and `remaining_amount`), `payments`, and `monthlyStats` (`YYYY-MM` breakdown).
- **Authentication**: Required (`authMiddleware`)
- **Responses**:
  - `200 OK`: `{ "customer": { ... }, "orders": [ ... ], "waterEntries": [ ... ], "payments": [ ... ], "monthlyStats": [ ... ] }`
  - `404 Not Found`: `{ "error": "Customer not found" }`

### `POST /api/customers`
Creates a new customer record.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  - `name` *(required, string)*
  - `phone` *(required, string)*
  - `address` *(required, string)*
  - `business_name` *(optional, string)*
  - `whatsapp_number` *(optional, string — defaults to `phone`)*
  - `latitude` *(optional, number)*
  - `longitude` *(optional, number)*
  - `customer_type` *(optional, string — defaults to `'Shop'`)*
  - `notes` *(optional, string)*
- **Responses**:
  - `201 Created`: `{ "message": "Customer added successfully", "customer": { ... } }`
  - `400 Bad Request`: `{ "error": "Customer Name, Phone number and Address are required." }`

### `PUT /api/customers/:id`
Updates an existing customer record (supports partial or full field updates).
- **Authentication**: Required (`authMiddleware`)
- **Responses**:
  - `200 OK`: `{ "message": "Customer updated successfully", "customer": { ... } }`
  - `404 Not Found`: `{ "error": "Customer not found" }`

### `POST /api/customers/:id/location`
Saves or updates GPS coordinates (`latitude`, `longitude`, and optional `address`) for a customer.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**: `{ "latitude": 19.1364, "longitude": 72.8296, "address": "Optional updated address" }`
- **Responses**:
  - `200 OK`: `{ "message": "Customer GPS location saved successfully", "customer": { ... } }`
  - `400 Bad Request`: `{ "error": "Latitude and longitude are required" }`

### `DELETE /api/customers/:id`
Deletes a customer record.
- **Authentication**: Required (`authMiddleware`)
- **Success Response (`200 OK`)**: `{ "message": "Customer removed successfully" }`

---

## 5. Products & Inventory (`server/routes/products.js`)

### `GET /api/products`
Lists products enriched with computed `units_sold` (order items + water entries) and `is_low_stock` (`stock <= minimum_stock`).
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `category` *(optional)*: `'All'`, `'Water'`, or `'Beverage'`.
  - `lowStockOnly` *(optional)*: `'true'` to filter where `stock <= minimum_stock`.
  - `activeOnly` *(optional)*: Defaults to active products (`active = 1`).
- **Success Response (`200 OK`)**: `{ "products": [ ... ] }`

### `POST /api/products`
Creates a new active product in the catalog.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  - `name` *(required, string)*
  - `category` *(required, `'Water'` | `'Beverage'`)*
  - `selling_price` *(required, number)*
  - `size` *(optional, string — defaults to `'Standard'`)*
  - `purchase_price` *(optional, number — defaults to `0`)*
  - `stock` *(optional, integer — defaults to `0`)*
  - `minimum_stock` *(optional, integer — defaults to `10`)*
- **Responses**:
  - `201 Created`: `{ "message": "Product created successfully", "product": { ... } }`
  - `400 Bad Request`: `{ "error": "Name, Category, and Selling Price are required" }`

### `PUT /api/products/:id`
Updates an existing product (supports partial or full field updates).
- **Authentication**: Required (`authMiddleware`)
- **Responses**:
  - `200 OK`: `{ "message": "Product updated successfully", "product": { ... } }`
  - `404 Not Found`: `{ "error": "Product not found" }`

### `POST /api/products/:id/stock` (Alias: `POST /api/products/:id/adjust-stock`)
Adjusts product stock quantity and clamps the result at `>= 0`.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  ```json
  {
    "adjustmentType": "ADD",
    "quantity": 50
  }
  ```
  *(`adjustmentType` or `type` supports `"ADD"`, `"REMOVE"`, or `"SET"`.)*
- **Responses**:
  - `200 OK`: `{ "message": "Stock updated successfully", "product": { ... } }`
  - `400 Bad Request`: `{ "error": "Valid quantity number required" }`

### `DELETE /api/products/:id`
Soft-deactivates a product by setting `active = 0`.
- **Authentication**: Required (`authMiddleware`)
- **Success Response (`200 OK`)**: `{ "message": "Product deactivated successfully" }`

---

## 6. Orders & WhatsApp Parser (`server/routes/orders.js`)

### `GET /api/orders`
Lists orders with joined customer details, line `items`, and `delivery_info`.
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `filter` or `period` *(optional)*: `'All'`, `'Today'`, `'Yesterday'`, `'This Week'`, `'This Month'`.
  - `startDate` & `endDate` *(optional)*: `YYYY-MM-DD` range filter.
  - `customerId` *(optional)*: Filter by customer ID.
  - `deliveryStatus` *(optional)*: `'All'`, `'New Order'`, `'Confirmed'`, `'Preparing'`, `'Out for Delivery'`, `'Delivered'`, `'Cancelled'`.
  - `paymentStatus` *(optional)*: `'All'`, `'Paid'`, `'Partial'`, `'Pending'`.
  - `search` *(optional)*: Substring search on `order_number`, `customer_name`, `business_name`, `phone`, or `delivery_address`.
- **Success Response (`200 OK`)**: `{ "orders": [ ... ] }`

### `GET /api/orders/:id`
Returns a single order with its `items` and `delivery_info`.
- **Authentication**: Required (`authMiddleware`)
- **Responses**:
  - `200 OK`: `{ "order": { ... } }`
  - `404 Not Found`: `{ "error": "Order not found" }`

### `POST /api/orders`
Creates a multi-item order, generates `order_number` (`ORD-YYYY-XXXX`), deducts stock for each item, creates a linked `deliveries` stop, and optionally records an initial payment.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  ```json
  {
    "customer_id": 1,
    "items": [
      { "product_id": 1, "quantity": 5, "price": 35 }
    ],
    "delivery_address": "Plot 14, Link Road, Andheri West",
    "special_instructions": "Deliver before 2 PM",
    "source": "Manual",
    "paid_amount": 0,
    "payment_mode": "Cash"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "message": "Order created successfully", "order": { ... } }`
  - `400 Bad Request`: `{ "error": "Customer and at least one item are required" }`
  - `404 Not Found`: `{ "error": "Customer not found" }`

### `PUT /api/orders/:id/status`
Updates an order's `delivery_status`, syncs the linked `deliveries` row, and restores/re-deducts product stock when transitioning to/from `'Cancelled'`.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**: `{ "status": "Out for Delivery" }`
- **Allowed Statuses**: `'New Order'`, `'Confirmed'`, `'Preparing'`, `'Out for Delivery'`, `'Delivered'`, `'Cancelled'`.
- **Responses**:
  - `200 OK`: `{ "message": "Order status updated to Out for Delivery", "status": "Out for Delivery" }`
  - `400 Bad Request`: `{ "error": "Invalid delivery status" }`
  - `404 Not Found`: `{ "error": "Order not found" }`

### `PUT /api/orders/:id/payment`
Marks an order as fully paid (`markAsFull: true`) or records an incremental payment (`amount`) against the order and inserts a `payments` row.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**: `{ "markAsFull": true, "payment_mode": "Cash" }` or `{ "amount": 500, "payment_mode": "UPI" }`
- **Responses**:
  - `200 OK`: `{ "message": "Payment updated. Status: Paid", "paid_amount": 1000, "payment_status": "Paid", "balance_remaining": 0 }`
  - `404 Not Found`: `{ "error": "Order not found" }`

### `POST /api/orders/parse-whatsapp`
Parses unstructured WhatsApp order text into matched customer details, catalog line items, total amount, and confidence level (`HIGH`, `MEDIUM`, `LOW`).
- **Authentication**: Required (`authMiddleware`)
- **Request Body**: `{ "messageText": "2 water bottles, 3 Thums Up, 2 Appy Fizz" }` (also accepts `message`)
- **Responses**:
  - `200 OK`: `{ "rawText": "...", "matchedCustomer": { ... } | null, "parsedItems": [ ... ], "items": [ ... ], "totalAmount": 2710, "confidence": "MEDIUM" }`
  - `400 Bad Request`: `{ "error": "Message text is required" }`

### `DELETE /api/orders/:id`
Deletes an order, its `order_items`, `deliveries`, and linked `payments`, and restores product stock if the order was not already `'Cancelled'`.
- **Authentication**: Required (`authMiddleware`)
- **Responses**:
  - `200 OK`: `{ "message": "Order deleted and inventory reverted" }`
  - `404 Not Found`: `{ "error": "Order not found" }`

---

## 7. Rapid Water Supply (`server/routes/water.js`)

### `GET /api/water`
Lists water supply entries with normalized `paid_amount` and `remaining_amount`, plus today's aggregate water stats.
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `date` *(optional)*: `YYYY-MM-DD`
  - `customerId` *(optional)*: Customer ID
  - `month` *(optional)*: `YYYY-MM`
- **Success Response (`200 OK`)**: `{ "entries": [ ... ], "today_stats": { ... }, "todayStats": { ... } }`

### `GET /api/water/summary`
Returns today's water delivery summary and per-customer monthly water totals (`total_water_units`, `total_amount`, `paid_amount`, `pending_amount`, `delivery_days`, `last_water_date`).
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `month` *(optional)*: `YYYY-MM` (defaults to current month)
- **Success Response (`200 OK`)**: `{ "selectedMonth": "2026-10", "todayStats": { ... }, "monthlySummary": [ ... ] }`

### `POST /api/water`
Records a rapid water jar delivery, deducts product stock, optionally creates a `payments` record when `payment_status === 'Paid'`, and returns the customer's updated pending balance.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  ```json
  {
    "customer_id": 1,
    "product_id": 1,
    "quantity": 5,
    "price": 35,
    "payment_status": "Pending",
    "payment_mode": "Cash",
    "notes": "Morning drop"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "message": "Water supply recorded successfully", "entry": { ... }, "customerPendingBalance": 175 }`
  - `400 Bad Request`: `{ "error": "Customer and valid Quantity are required" }`

### `DELETE /api/water/:id`
Deletes a water entry, restores the product's stock quantity, and removes any payment linked via `water_entry_id`.
- **Authentication**: Required (`authMiddleware`)
- **Responses**:
  - `200 OK`: `{ "message": "Water entry removed and stock reverted" }`
  - `404 Not Found`: `{ "error": "Water entry not found" }`

---

## 8. Deliveries & Route Dispatch (`server/routes/deliveries.js`)

### `GET /api/deliveries`
Lists scheduled deliveries ordered by `route_sequence ASC, created_at ASC`, enriched with customer details, order summary, `has_coordinates`, and `order_items`.
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `status` *(optional)*: `'All'`, `'New Order'`, `'Confirmed'`, `'Preparing'`, `'Out for Delivery'`, `'Delivered'`.
- **Success Response (`200 OK`)**: `{ "deliveries": [ ... ] }`

### `PUT /api/deliveries/reorder`
Updates `route_sequence` numbers for an array of delivery stops.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  ```json
  {
    "sequences": [
      { "id": 1, "route_sequence": 1 },
      { "id": 2, "route_sequence": 2 }
    ]
  }
  ```
- **Responses**:
  - `200 OK`: `{ "message": "Delivery route updated successfully" }`
  - `400 Bad Request`: `{ "error": "Sequences array required" }`

### `PUT /api/deliveries/:id/status`
Updates a delivery's `status` and optional `driver_notes`, stamps `delivered_at` when `'Delivered'`, syncs `orders.delivery_status`, and handles stock restoration if cancelled.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**: `{ "status": "Delivered", "driver_notes": "Received at reception" }`
- **Responses**:
  - `200 OK`: `{ "message": "Delivery updated to Delivered", "delivery": { ... } }`
  - `404 Not Found`: `{ "error": "Delivery not found" }`

---

## 9. Payments (`server/routes/payments.js`)

### `GET /api/payments`
Returns payment history and `pendingCustomers` (customers with `total_pending > 0` sorted descending by amount due).
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `mode` *(optional)*: `'All'`, `'Cash'`, `'UPI'`, `'Bank Transfer'`, `'Cheque'`.
  - `customerId` *(optional)*: Filter by customer ID.
- **Success Response (`200 OK`)**: `{ "payments": [ ... ], "pendingCustomers": [ ... ] }`

### `POST /api/payments`
Records a customer payment and atomically allocates it to a specified `order_id`, a specified `water_entry_id`, or across unpaid orders and water entries in FIFO order.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**:
  ```json
  {
    "customer_id": 1,
    "order_id": null,
    "water_entry_id": null,
    "amount": 500,
    "payment_mode": "UPI",
    "notes": "UPI Ref 412389012"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "message": "Payment recorded successfully", "paymentId": 4, "payment": { ... }, "amount": 500, "mode": "UPI" }`
  - `400 Bad Request`: `{ "error": "Customer and valid payment amount are required" }`
  - `404 Not Found`: `{ "error": "Customer not found" }`

---

## 10. Reports (`server/routes/reports.js`)

### `GET /api/reports/sales`
Returns time-bucketed revenue splitting `orderSales`, `waterSales`, and `totalSales`.
- **Authentication**: Required (`authMiddleware`)
- **Query Parameters**:
  - `period` *(optional)*: `'daily'` (last 14 days, default), `'weekly'` (last 8 weeks), or `'monthly'` (last 6 months).
- **Success Response (`200 OK`)**: `{ "salesData": [ ... ] }`

### `GET /api/reports/customer-wise`
Returns customer financial performance sorted by `total_sales DESC`.
- **Authentication**: Required (`authMiddleware`)
- **Success Response (`200 OK`)**: `{ "customerWise": [ ... ] }`

### `GET /api/reports/product-wise`
Returns product sales performance (`units_sold`, `revenue`, `profit`) combining `order_items` and `water_entries`, sorted by `units_sold DESC`.
- **Authentication**: Required (`authMiddleware`)
- **Success Response (`200 OK`)**: `{ "productWise": [ ... ] }`

---

## 11. Business Settings (`server/routes/settings.js`)

### `GET /api/settings/public`
Returns only public, non-sensitive branding settings (`business_name`, `currency`).
- **Authentication**: None (Public)
- **Success Response (`200 OK`)**: `{ "settings": { "business_name": "Ocean Enterprises", "currency": "₹" } }`

### `GET /api/settings`
Returns all business configuration key-value pairs (`business_name`, `phone`, `whatsapp`, `email`, `address`, `upi_id`, `currency`).
- **Authentication**: Required (`authMiddleware`)
- **Success Response (`200 OK`)**: `{ "settings": { ... } }`

### `PUT /api/settings`
Upserts key-value pairs in `business_settings`.
- **Authentication**: Required (`authMiddleware`)
- **Request Body**: `{ "business_name": "Ocean Enterprises", "upi_id": "oceanenterprises@okhdfcbank", ... }`
- **Success Response (`200 OK`)**: `{ "message": "Settings saved successfully", "settings": { ... } }`

