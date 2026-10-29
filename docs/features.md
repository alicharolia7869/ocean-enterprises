# Feature Inventory & Specification

This document provides a verified inventory of every feature implemented in the **Ocean Enterprises Business Management System**, including its UI location, user operation, data mutations, validation rules, dependencies, limitations, and verification status.

---

## Summary Matrix

| # | Feature Name | Frontend Component | Backend Route Module | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Authentication & Session Management | `Login.jsx`, `AuthContext.jsx` | `server/routes/auth.js` | Verified (Automated Tests + Live Production) |
| 2 | Operations & Distribution Dashboard | `Dashboard.jsx` | `server/routes/dashboard.js` | Verified (Automated Tests + Live Production) |
| 3 | Global Search (`Ctrl+K` / `Cmd+K`) | `GlobalSearchModal.jsx` | `/api/customers`, `/api/products`, `/api/orders` | Verified (Code Audited + Build Verified) |
| 4 | 10-Second Rapid Water Supply Entry | `WaterEntry.jsx` | `server/routes/water.js` | Verified (Automated Tests + Live Production) |
| 5 | WhatsApp Order Parser & Queue | `WhatsAppOrders.jsx` | `server/routes/orders.js` | Verified (Automated Tests + Live Production) |
| 6 | Delivery Management Board | `Deliveries.jsx` | `server/routes/deliveries.js` | Verified (Automated Tests + Live Production) |
| 7 | Interactive GPS Route Map | `DeliveryRoute.jsx` | `server/routes/deliveries.js` | Verified (Code Audited + Build Verified) |
| 8 | Customer Directory, GPS & Ledgers | `Customers.jsx` | `server/routes/customers.js` | Verified (Automated Tests + Live Production) |
| 9 | Payment Collection & FIFO Allocation | `Payments.jsx` | `server/routes/payments.js` | Verified (Automated Tests + Live Production) |
| 10 | All Orders Management & CSV Export | `Orders.jsx` | `server/routes/orders.js` | Verified (Automated Tests + Live Production) |
| 11 | Product Catalog & Stock Adjustments | `Products.jsx` | `server/routes/products.js` | Verified (Automated Tests + Live Production) |
| 12 | Financial & Profitability Reports | `Reports.jsx` | `server/routes/reports.js` | Verified (Automated Tests + Live Production) |
| 13 | Business Settings & Password Change | `Settings.jsx` | `server/routes/settings.js`, `auth.js` | Verified (Automated Tests + Live Production) |
| 14 | In-App Help & Documentation Center | `DocumentationCenter.jsx` | Static / Client-side (`/docs`) | Verified (Automated Build + Route Verified) |

---

## Detailed Feature Specifications

### 1. Authentication & Session Management
- **Purpose**: Secure access to business operations, customer records, and financial ledgers using signed JWT tokens.
- **Where It Appears**:
  - Full-screen login gate (`client/src/pages/Login.jsx`) when unauthenticated.
  - User profile badge and logout buttons in `client/src/components/Navigation.jsx`.
- **How a User Operates It**:
  - Enter **Email**, **Phone Number** (with or without `+91`), or **Account Name** (`Ocean Admin` / `admin`) and **Password**, then click **Sign In to Workspace**.
  - In local development mode (`import.meta.env.DEV`), an **Auto-fill Default Admin** shortcut is available on the login card.
- **Data Read / Changed**:
  - Reads `users` table (`POST /api/auth/login`, `GET /api/auth/me`).
  - Stores `ocean_token` and `ocean_user` in browser `localStorage`.
  - Updates `users.password_hash` on password change (`POST` or `PUT /api/auth/change-password`).
- **Validation & Permission Requirements**:
  - Login requires non-empty identifier and password (`400 Bad Request` if missing, `401 Unauthorized` if invalid).
  - Password change requires `authMiddleware`, valid `currentPassword`, and `newPassword.length >= 6`.
  - Production environments strictly require `JWT_SECRET` (`>= 16` chars); missing or weak secrets return `503 Service Unavailable`.
- **Dependencies**: `bcryptjs`, `jsonwebtoken`, `AuthContext.jsx`.
- **Known Limitations**: No self-service "Forgot Password" email reset flow; administrator passwords are changed via Settings or database migration/seed scripts.
- **Verification Status**: Verified by 9 automated tests in Suite 2 & Suite 11 of `test/suite.test.js` and live production login tests.

---

### 2. Operations & Distribution Dashboard
- **Purpose**: Provide real-time visibility into daily plant output, active dispatch stages, revenue, pending receivables, and low-stock warnings.
- **Where It Appears**: Default workspace tab (`activeTab === 'dashboard'`, `client/src/pages/Dashboard.jsx`).
- **How a User Operates It**:
  - View 6 top KPI cards: **Today's Orders**, **Water Jars (20L)**, **Beverage Orders**, **Pending Deliveries**, **Pending Payments**, and **Today's Sales**.
  - Use the **Quick Operations** 6-button grid to jump directly to Rapid Water Entry, New Order modal, WhatsApp Orders, Route Map, Record Payment, or Add Customer.
  - Monitor the **Live Dispatch Pipeline** (`New Order`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`).
  - Update any active order's delivery status inline from the **Today's Active Orders** table.
  - Review **Monthly Cumulative Revenue** and **Low Stock Alerts**.
- **Data Read / Changed**:
  - Reads aggregated metrics from `orders`, `order_items`, `water_entries`, `deliveries`, `customers`, and `products` via `GET /api/dashboard/stats`.
  - Inline status dropdown mutates `orders.delivery_status` and `deliveries.status` via `PUT /api/orders/:id/status`.
- **Validation & Permission Requirements**: Requires `authMiddleware`. Inline status updates validate against allowed status enum values.
- **Dependencies**: `server/routes/dashboard.js`, `server/routes/orders.js`.
- **Known Limitations**: Dashboard statistics refresh on page load, inline status change, or clicking **Sync Live** (no WebSocket push).
- **Verification Status**: Verified in Suite 3 of `test/suite.test.js` and on live production.

---

### 3. Global Search Modal (`Ctrl+K` / `Cmd+K`)
- **Purpose**: Instantly locate any customer, product, or order from anywhere in the workspace using the keyboard.
- **Where It Appears**: Header bar trigger (`Search anything... Ctrl K`) and global keyboard listener in `client/src/App.jsx` (`client/src/components/GlobalSearchModal.jsx`).
- **How a User Operates It**:
  - Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (macOS) or click the header search button.
  - Type at least 2 characters to filter customers (by name, business name, phone, address), products (by name, category), and orders (by order number, customer name).
  - Click a customer result to open the Customers tab with that customer's detail ledger open, an order result to open All Orders, or a product result to open Inventory & Stock.
- **Data Read / Changed**: Reads `/api/customers`, `/api/products`, and `/api/orders` when the modal opens. Read-only.
- **Validation & Permission Requirements**: Requires authenticated session.
- **Dependencies**: `GlobalSearchModal.jsx`, `api.js`.
- **Known Limitations**: Fetches full lists client-side when opened and filters in memory (fast for hundreds/thousands of records, not paginated for millions).
- **Verification Status**: Code-audited and build-verified.

---

### 4. 10-Second Rapid Water Supply Entry
- **Purpose**: Allow dock operators and drivers to record 20L water jar deliveries in under 10 seconds with automatic inventory deduction and instant WhatsApp receipt generation.
- **Where It Appears**: Sidebar **Rapid Water Entry** (`FAST` badge), top header **+ Rapid Water** button, mobile bottom bar **Water** tab (`client/src/pages/WaterEntry.jsx`).
- **How a User Operates It**:
  - Search and select a customer from the dropdown.
  - Tap `+1`, `+2`, `+5`, `+10`, or `Reset (1)` to set jar quantity, or type a custom quantity and price per jar (default `₹35`).
  - Select **Pending (Add to Monthly Ledger)** or **Paid Instantly** (with payment mode `Cash`, `UPI`, or `Bank Transfer`).
  - Click **SAVE WATER ENTRY**.
  - Optionally click **Send WhatsApp Slip** on the confirmation banner to send a receipt to the customer, or switch to the **Customer Monthly Water Ledger** tab to view monthly totals by customer.
- **Data Read / Changed**:
  - Reads `GET /api/customers`, `GET /api/water/summary?month=YYYY-MM`, and `GET /api/water?date=YYYY-MM-DD`.
  - `POST /api/water` inserts into `water_entries`, decrements `products.stock` for the water product, and if `payment_status === 'Paid'`, inserts a completed record into `payments`.
  - `DELETE /api/water/:id` deletes the water entry, removes any linked payment (`water_entry_id`), and restores `products.stock`.
- **Validation & Permission Requirements**: Requires `authMiddleware`, `customer_id`, and `quantity > 0`.
- **Dependencies**: `server/routes/water.js`, `client/src/utils/whatsapp.js`.
- **Known Limitations**: Defaults to the first active `Water` category product matching `20L` in `products` when `product_id` is not explicitly passed.
- **Verification Status**: Verified in Suite 6 & Suite 9 of `test/suite.test.js` and live production persistence tests.

---

### 5. WhatsApp Order Processing Engine (NLP Parser)
- **Purpose**: Convert unstructured WhatsApp messages into structured multi-item orders and send pre-formatted WhatsApp status updates.
- **Where It Appears**: Sidebar **WhatsApp Orders** and mobile bottom bar **Orders** tab (`client/src/pages/WhatsAppOrders.jsx`).
- **How a User Operates It**:
  - Paste a customer's WhatsApp message into the text area (or click one of the 3 sample preset pills) and click **Auto-Parse Message**.
  - Review the detected customer (or select one manually), verify the extracted product rows, quantities, and subtotals, add optional delivery instructions, and click **Accept & Create Order**.
  - In the right-hand **Order Processing & WhatsApp Notification Queue**, click **Confirm Order**, **Out for Delivery**, **Delivered**, **Remind Payment**, or **Mark Paid** to update status and trigger WhatsApp messages.
  - Click **Share Order Template** in the header to open a shareable WhatsApp catalog message link.
- **Data Read / Changed**:
  - `POST /api/orders/parse-whatsapp` reads `customers` and active `products` to match keywords and calculate totals (read-only).
  - Accepting an order calls `POST /api/orders`, creating rows in `orders`, `order_items`, and `deliveries`, and decrementing `products.stock`.
- **Validation & Permission Requirements**: Requires `authMiddleware` and non-empty `messageText` string.
- **Dependencies**: `server/routes/orders.js`, `client/src/utils/whatsapp.js`.
- **Known Limitations**: Uses a deterministic keyword dictionary (`20l`, `water`, `jar`, `1l`, `500ml water`, `frooti`, `appy fizz`, `thums up`, `litchi`, `guava`). Unlisted product names must be added via the standard **All Orders** modal.
- **Verification Status**: Verified in Suite 7 of `test/suite.test.js`.

---

### 6. Delivery Management Board
- **Purpose**: Manage active delivery stops, update dispatch stages, reorder stop sequences, and launch driver navigation or customer notifications.
- **Where It Appears**: Sidebar **Deliveries** and mobile bottom bar **Delivery** tab (`client/src/pages/Deliveries.jsx`).
- **How a User Operates It**:
  - Filter stops by status (`All`, `New Order`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`).
  - Use the Up/Down chevron buttons on any stop card to change its `route_sequence`.
  - Change a stop's status using the status dropdown, click **Navigate (Google Maps)** for turn-by-turn directions, or click **Out for Delivery Alert** / **Delivered Confirmation** to message the customer on WhatsApp.
- **Data Read / Changed**:
  - Reads `GET /api/deliveries`.
  - Updates sequence via `PUT /api/deliveries/reorder`.
  - Updates status via `PUT /api/deliveries/:id/status` (which also syncs `orders.delivery_status` and restores/deducts stock if transitioning to/from `Cancelled`).
- **Validation & Permission Requirements**: Requires `authMiddleware`.
- **Dependencies**: `server/routes/deliveries.js`, `client/src/utils/maps.js`, `client/src/utils/whatsapp.js`.
- **Known Limitations**: Reordering updates the full list order currently loaded in the active filter view.
- **Verification Status**: Verified in Suite 8 of `test/suite.test.js`.

---

### 7. Interactive GPS Route Map
- **Purpose**: Visualize all delivery stops with saved GPS coordinates on an interactive map with numbered stop pins and route polylines.
- **Where It Appears**: Sidebar **Route Map** or via the **Interactive Route Map** button on the Deliveries page (`client/src/pages/DeliveryRoute.jsx`).
- **How a User Operates It**:
  - Inspect numbered blue pins (active stops) and green pins (completed stops) on the OpenStreetMap canvas.
  - Click any pin popup or sidebar stop card to view order items and launch Google Maps turn-by-turn navigation.
- **Data Read / Changed**: Reads `GET /api/deliveries`. Read-only view.
- **Validation & Permission Requirements**: Requires `authMiddleware`.
- **Dependencies**: Leaflet `1.9.4` (loaded in `client/index.html`), OpenStreetMap tile servers, `client/src/utils/maps.js`.
- **Known Limitations**: Stops whose customer/order records do not have `latitude` and `longitude` saved are listed in the right-hand Stop Sequence panel with a `No GPS` badge and are not plotted on the map canvas until coordinates are captured.
- **Verification Status**: Code-audited and build-verified.

---

### 8. Customer Directory, Live GPS Capture & Monthly Ledgers
- **Purpose**: Maintain the master directory of restaurants, offices, shops, and residential clients, capture live GPS coordinates, and inspect complete per-customer financial ledgers.
- **Where It Appears**: Sidebar **Customers** and mobile bottom bar **Clients** tab (`client/src/pages/Customers.jsx`).
- **How a User Operates It**:
  - Filter customers by type (`All`, `Restaurant`, `Office`, `Shop`, `Residential`) or search by name, business name, phone, or address.
  - Click **+ Add New Customer** (or edit an existing customer) and optionally click **Capture Live Phone GPS** to fill `latitude` and `longitude` from device geolocation.
  - Click **Ledger** on any customer row to open the detailed Customer Profile & Account Ledger modal showing:
    - Total Sales, Total Paid, and Pending Due summary cards.
    - **Monthly Breakdown** table (`YYYY-MM`, water jars, orders count, billed amount, paid amount, pending balance).
    - **Recent Water Supply Log** and **Order History**.
    - **Print Statement** and **WhatsApp Reminder** actions.
- **Data Read / Changed**:
  - `GET /api/customers`, `GET /api/customers/:id`, `POST /api/customers`, `PUT /api/customers/:id`, `POST /api/customers/:id/location`, `DELETE /api/customers/:id`.
- **Validation & Permission Requirements**: Requires `authMiddleware`. Creating a customer requires `name`, `phone`, and `address` (`400 Bad Request` if missing).
- **Dependencies**: `server/routes/customers.js`, `utils/maps.js`, `utils/whatsapp.js`, `utils/export.js`.
- **Known Limitations**: Deleting a customer cascades (`ON DELETE CASCADE`) to their orders, water entries, payments, and deliveries.
- **Verification Status**: Verified in Suite 4 & Suite 9 of `test/suite.test.js`.

---

### 9. Payment Collection & FIFO Receivables Allocation
- **Purpose**: Record customer payments (Cash, UPI, Bank Transfer, Cheque), automatically allocate payments across unpaid orders and water entries, and send WhatsApp payment reminders.
- **Where It Appears**: Sidebar **Payments** (`client/src/pages/Payments.jsx`).
- **How a User Operates It**:
  - View **Total Collections Recorded**, **Total Pending Receivables**, and **Accounts with Balance Due**.
  - In the left **Pending Receivables** panel, click **Remind** to send a WhatsApp payment reminder with the business UPI ID, or click **Collect** to open the Record Payment modal pre-filled with that customer's pending balance.
  - In the right **Payment Transaction History** table, filter completed payments by mode (`All`, `Cash`, `UPI`, `Bank Transfer`, `Cheque`).
- **Data Read / Changed**:
  - `GET /api/payments` returns payment history and `pendingCustomers`.
  - `POST /api/payments` inserts into `payments` and updates `orders` and/or `water_entries` (`paid_amount` and `payment_status`) inside an atomic transaction (`db.transaction`).
- **Validation & Permission Requirements**: Requires `authMiddleware`, valid `customer_id`, and `amount > 0`.
- **Dependencies**: `server/routes/payments.js`, `utils/whatsapp.js`.
- **Known Limitations**: Overpayments exceeding the sum of all currently unpaid orders and water entries are recorded in full in the `payments` table, while individual order/water entry `paid_amount` values cap at their respective `total_amount`.
- **Verification Status**: Verified in Suite 9 of `test/suite.test.js` and live PostgreSQL transaction tests.

---

### 10. All Orders Management & CSV Export
- **Purpose**: Create multi-item orders manually, filter historical orders by time/customer/delivery status/payment status, record order payments, and export order logs to CSV.
- **Where It Appears**: Sidebar **All Orders** (`client/src/pages/Orders.jsx`).
- **How a User Operates It**:
  - Filter orders by Time Period (`All`, `Today`, `Yesterday`, `This Week`, `This Month`), Customer, Delivery Status, Payment Status, or search query.
  - Click **+ Create Order** to build a multi-item order with automatic product pricing and optional initial advance payment.
  - Inline-update an order's delivery status, click **Mark Paid** (`PUT /api/orders/:id/payment`), send a WhatsApp invoice slip, or delete an order (`DELETE /api/orders/:id`).
  - Click **Export CSV** to download `Ocean_Enterprises_Orders_YYYY-MM-DD.csv`.
- **Data Read / Changed**:
  - `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders`, `PUT /api/orders/:id/status`, `PUT /api/orders/:id/payment`, `DELETE /api/orders/:id`.
- **Validation & Permission Requirements**: Requires `authMiddleware`. Order creation requires `customer_id` and non-empty `items` array.
- **Dependencies**: `server/routes/orders.js`, `utils/export.js`, `utils/whatsapp.js`.
- **Verification Status**: Verified in Suite 7 of `test/suite.test.js`.

---

### 11. Product Catalog & Stock Adjustments
- **Purpose**: Manage water and beverage SKUs, selling/purchase prices, stock quantities, and low-stock alert thresholds.
- **Where It Appears**: Sidebar **Inventory & Stock** (`client/src/pages/Products.jsx`).
- **How a User Operates It**:
  - Filter by category (`All`, `Water`, `Beverage`), toggle **Low Stock Only**, or search by product name.
  - Click **+ Add New Product** or edit an existing product's prices, size, stock, and minimum stock alert threshold.
  - Click **+ Add Stock** on any product row to add incoming warehouse inventory (`POST /api/products/:id/stock`).
  - Click the delete icon to soft-deactivate a product (`active = 0`).
- **Data Read / Changed**:
  - `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `POST /api/products/:id/stock` (alias `/adjust-stock`), `DELETE /api/products/:id`.
- **Validation & Permission Requirements**: Requires `authMiddleware`. Creating a product requires `name`, `category`, and `selling_price`. Stock adjustments clamp at `0` so stock never becomes negative.
- **Dependencies**: `server/routes/products.js`.
- **Verification Status**: Verified in Suite 5 of `test/suite.test.js`.

---

### 12. Business Reports & Analytics
- **Purpose**: Generate time-series revenue breakdowns, customer ledger summaries, and product profitability reports with CSV download and printable views.
- **Where It Appears**: Sidebar **Reports** (`client/src/pages/Reports.jsx`).
- **How a User Operates It**:
  - Switch between **Sales Report** (`Daily`, `Weekly`, `Monthly`), **Customer-wise Report**, and **Product-wise Report**.
  - Click **Export CSV** or **Print / PDF** on any report tab.
- **Data Read / Changed**:
  - Reads `GET /api/reports/sales?period=daily|weekly|monthly`, `GET /api/reports/customer-wise`, and `GET /api/reports/product-wise`. Read-only.
- **Validation & Permission Requirements**: Requires `authMiddleware`.
- **Dependencies**: `server/routes/reports.js`, `utils/export.js`.
- **Verification Status**: Verified in Suite 10 of `test/suite.test.js`.

---

### 13. Business Configuration & Security Settings
- **Purpose**: Configure company branding, contact numbers, depot address, UPI handle, and change the administrator password.
- **Where It Appears**: Sidebar **Settings** (`client/src/pages/Settings.jsx`).
- **How a User Operates It**:
  - Update **Business Name**, **UPI ID**, **Phone Number**, **WhatsApp Number**, and **Depot / Warehouse Address**, then click **Save Business Settings**.
  - Enter Current Password, New Password (minimum 6 characters), and Confirm New Password, then click **Update Password**.
- **Data Read / Changed**:
  - `GET /api/settings/public` returns only non-sensitive branding (`business_name`, `currency`) without authentication.
  - `GET /api/settings` and `PUT /api/settings` read/write key-value pairs in `business_settings` (requires `authMiddleware`).
  - `POST /api/auth/change-password` updates `users.password_hash` (requires `authMiddleware`).
- **Verification Status**: Verified in Suite 2 & Suite 11 of `test/suite.test.js`.

---

### 14. In-App Help & Documentation Center (`/docs`)
- **Purpose**: Provide searchable, responsive operator documentation, feature guides, FAQs, and troubleshooting directly inside the website.
- **Where It Appears**:
  - URL routes `/docs`, `/docs/getting-started`, `/docs/user-guide`, `/docs/features`, `/docs/troubleshooting`, and `/docs/faq`.
  - Accessible from the **Help & Docs** link in the workspace sidebar/header and from the **Help & Documentation** link on the Login screen (`client/src/pages/DocumentationCenter.jsx`).
- **How a User Operates It**:
  - Browse topics via the left documentation sidebar or mobile navigation drawer.
  - Use the instant search bar to filter articles and FAQs by keyword (matching titles, summaries, headings, and body content case-insensitively).
  - Use the right-hand Table of Contents ("On this page") and Previous / Next article cards to navigate sequentially.
- **Data Read / Changed**: Reads structured documentation from `client/src/data/docsContent.js`. Read-only; makes no database mutations.
- **Verification Status**: Verified via Vite production build, lint checks, and route tests.

