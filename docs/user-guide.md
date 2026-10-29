# User Guide — Ocean Enterprises Business Management System

This guide walks operators, dispatchers, and administrators step-by-step through every daily workflow in the **Ocean Enterprises Business Management System**.

---

## 1. Accessing the Application & Signing In

1. Open **[https://ocean-enterprises.vercel.app/](https://ocean-enterprises.vercel.app/)** (or `http://localhost:5000` in local development).
2. On the **Sign In to Workspace** screen:
   - **Email or Phone Number**: Enter your registered administrator email (`admin@ocean.com`), phone number (`9876543210` or `+91 9876543210`), or account name (`Ocean Admin`).
   - **Password**: Enter your account password.
3. Click **Sign In to Workspace**.
4. Once authenticated, your session remains active for **30 days** unless you click **Log Out** in the sidebar footer or top-right header.

> **Need Help Before Signing In?** Click **Help & Documentation (`/docs`)** at the bottom of the Sign-In card at any time to open the built-in Help Center without needing to log in first.

---

## 2. Navigating the Workspace

### Desktop & Tablet Navigation
- **Left Sidebar**: Lists all operational modules:
  - **Dashboard** — Real-time plant KPIs, dispatch pipeline, and active orders.
  - **Rapid Water Entry (`FAST`)** — 10-second 20L water jar delivery logger.
  - **WhatsApp Orders** — Natural-language WhatsApp message parser and notification queue.
  - **Deliveries** — Dispatch board with route stop sequencing and status updates.
  - **Route Map** — Interactive Leaflet GPS map with numbered stop pins.
  - **Customers** — Client directory, live GPS coordinate capture, and monthly ledgers.
  - **Payments** — Cash/UPI collection logger, FIFO balance allocation, and payment reminders.
  - **All Orders** — Multi-item order builder, historical filters, and CSV export.
  - **Inventory & Stock** — Product catalog, pricing margins, and stock adjustments.
  - **Reports** — Daily/weekly/monthly sales, customer ledgers, and product profitability.
  - **Settings** — Company profile, UPI ID, and password management.
  - **Help & Docs** — Built-in searchable documentation center (`/docs`).
- **Top Header Bar**:
  - **Search anything... (`Ctrl K` / `Cmd K`)**: Opens the Global Search modal from any screen.
  - **+ Rapid Water**: 1-click shortcut to the Rapid Water Entry screen.
  - **Help (`?`)**: Opens the Help & Documentation Center.
  - **Log Out**: Ends the current session and clears stored credentials.

### Mobile Navigation (Screens `<= 1024px`)
- **Bottom Thumb Bar**: Provides 1-tap access to the 5 most frequent field tabs: **Home**, **Water**, **Orders** (WhatsApp), **Delivery**, and **Clients**.
- **Top-Left Menu Button (`☰`)**: Opens the full slide-out navigation drawer to access Route Map, Payments, All Orders, Inventory & Stock, Reports, Settings, and Help & Docs.

---

## 3. Recording a 10-Second Rapid Water Supply Entry

Use **Rapid Water Entry** whenever a delivery van or loading dock drops 20L water jars for a customer:

1. Click **Rapid Water Entry** in the sidebar (or **+ Rapid Water** in the top header).
2. **Select Customer**:
   - Optionally type in the **Quick filter customer** box to narrow the dropdown by name, business name, or phone number.
   - Select the customer from the **1. Select Customer** dropdown. Their current pending balance is displayed next to their name.
3. **Set Jar Quantity & Rate**:
   - Tap the tactile quick-increment buttons (**`+1`**, **`+2`**, **`+5`**, **`+10`**, or **`Reset (1)`**) or type the exact number of jars in **Quantity (Jars)**.
   - Confirm or adjust **Price / Jar (₹)** (defaults to `₹35`). The **Total Payable** box updates automatically.
4. **Choose Payment Status**:
   - Click **⏳ Pending (Add to Monthly Ledger)** if the customer will pay later.
   - Click **✅ Paid Instantly** if the driver collected payment on the spot, then choose **Payment Mode** (`Cash`, `UPI`, or `Bank Transfer`).
5. **Save & Send Receipt**:
   - Click **SAVE WATER ENTRY**.
   - Product stock for `20L Water Jar` is automatically reduced, and a green confirmation banner appears at the top of the screen.
   - Click **Send WhatsApp Slip** on the green banner to open WhatsApp with a pre-formatted delivery receipt showing today's jars, today's amount, and the customer's updated total pending balance.

### Viewing the Monthly Customer Water Summary
- On the right side of the **Rapid Water Entry** screen, switch between:
  - **Today's Water Log**: Lists every water drop recorded today (with a trash icon to delete an entry and restore stock if logged by mistake).
  - **Customer Monthly Water Ledger**: Select any month (`YYYY-MM`) to see each customer's total jars, delivery days, total billed, amount paid, and pending balance for that month.

---

## 4. Processing WhatsApp Orders

When a customer sends a text order on WhatsApp (for example: `"Hotel Shalimar: 2 water bottles, 3 Thums Up, 2 Appy Fizz"`):

1. Open **WhatsApp Orders** from the sidebar.
2. Paste the customer's message into **1. Paste Customer WhatsApp Message** (or click one of the sample message pills to test).
3. Click **Auto-Parse Message**.
4. Review the **Parsed Order Preview** card:
   - Check the **Confidence Badge** (`HIGH` when both customer and products match, `MEDIUM` when products match but customer must be chosen manually).
   - Verify or change the **Select / Confirm Customer** dropdown and **Delivery Address**.
   - Inspect the **Detected Items & Quantities** table and the computed **TOTAL** amount.
   - Add any optional **Special Delivery Instructions**.
5. Click **Accept & Create Order**.
   - The system creates a formal order (`ORD-YYYY-XXXX`), deducts inventory for every item, and adds the order to the **Delivery Management Board**.
6. In the right-hand **Order Processing & WhatsApp Notification Queue**, use the action buttons on any order card:
   - **Confirm Order** — Marks the order `Confirmed` and opens a WhatsApp confirmation message for the customer.
   - **Out for Delivery** — Marks the order `Out for Delivery` and opens a WhatsApp dispatch alert.
   - **Delivered** — Marks the order `Delivered` and opens a WhatsApp delivery completion message.
   - **Remind Payment** — Opens a WhatsApp payment reminder with your business UPI ID.
   - **Mark Paid** — Records full payment (`Cash`) and marks the order `Paid`.

---

## 5. Managing Deliveries & Route Navigation

### Using the Delivery Management Board
1. Open **Deliveries** from the sidebar.
2. Filter active stops using the top status pills (`All`, `New Order`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`).
3. **Reorder Route Stops**:
   - Each card displays its stop number (`#1`, `#2`, `#3`...).
   - Click the **Up (`▲`)** or **Down (`▼`)** arrows next to the stop number to move a stop earlier or later in the driver's sequence.
4. **Navigate & Update Status**:
   - Click **Navigate (Google Maps)** to open turn-by-turn directions to the customer's saved GPS coordinates (or street address if coordinates are not saved).
   - Use the **Update Status** dropdown on the right of the card to advance the stop (`Confirmed` -> `Preparing` -> `Out for Delivery` -> `Delivered`).

### Using the Interactive Route Map
1. Click **Route Map** in the sidebar (or **Interactive Route Map** on the Deliveries screen).
2. View all stops with saved GPS coordinates plotted as numbered pins on OpenStreetMap (`Blue` = active stop, `Green` = delivered stop) connected by a dashed route line.
3. Click any map pin (or click **Navigate** on any stop in the right-hand **Stop Sequence** list) to launch Google Maps directions.

---

## 6. Managing Customers, GPS Coordinates & Statements

1. Open **Customers** from the sidebar.
2. Use the category pills (`All`, `Restaurant`, `Office`, `Shop`, `Residential`) or the search box to find a client.
3. **Adding or Editing a Customer**:
   - Click **+ Add New Customer** (or the **Edit** icon on an existing row).
   - Fill in **Customer Name**, **Business / Shop Name**, **Customer Type**, **Phone Number**, **WhatsApp Number**, and **Full Delivery Address**.
   - **Pinning Exact GPS Coordinates**: If you are at the customer's shop on a phone or GPS-enabled device, click **Capture Live Phone GPS** to automatically populate **Latitude** and **Longitude**, or type coordinates manually.
   - Click **Save Customer**.
4. **Viewing a Customer's Monthly Ledger & Printing Statements**:
   - Click **Ledger** on any customer row.
   - Review the customer's **Total Sales**, **Total Paid**, **Pending Due**, **Monthly Breakdown (Water + Orders)**, **Recent Water Supply Log**, and **Order History**.
   - Click **Print Statement** to generate a formatted, print-ready statement (or save as PDF in your browser's print dialog).
   - Click **WhatsApp Reminder** to send an overdue balance reminder directly to the customer.

---

## 7. Managing Products & Warehouse Stock

1. Open **Inventory & Stock** from the sidebar.
2. Filter by **All**, **Water**, **Beverage**, or toggle **Low Stock Only** to see items at or below their minimum stock threshold.
3. **Adding a New Product**:
   - Click **+ Add New Product**, enter the **Product Name**, **Category** (`Water` or `Beverage`), **Pack Size** (e.g., `20L Jar`, `600ml x 24`), **Selling Price (₹)**, **Purchase Cost (₹)**, **Initial Stock**, and **Minimum Stock Alert Threshold**, then click **Create Product**.
4. **Adding Incoming Stock Quickly**:
   - Click **+ Add Stock** on any product row, enter the number of incoming units received at the warehouse, and click **Add Stock**.

---

## 8. Recording Payments & Settling Balances

1. Open **Payments** from the sidebar.
2. Review the left-hand **Pending Receivables (Action Required)** list, sorted from highest pending balance to lowest:
   - Click **Remind** to open a pre-filled WhatsApp payment reminder containing the exact amount due and your UPI ID.
   - Click **Collect** next to a customer to open the **Record Customer Payment** modal pre-populated with that customer and their full pending balance.
3. **Recording a Partial or Full Payment**:
   - You can enter any payment amount (full balance or partial payment), choose the **Payment Mode** (`Cash`, `UPI`, `Bank Transfer`, `Cheque`), add optional reference notes (such as a UPI transaction ID), and click **Save Payment**.
   - **Automatic FIFO Allocation**: The system automatically applies the payment to the customer's oldest unpaid orders first and then to their oldest unpaid water entries, marking items `Paid` or `Partial` accordingly.

---

## 9. Viewing & Exporting Reports

1. Open **Reports** from the sidebar.
2. Choose one of the three report tabs:
   - **Sales Report**: Toggle between **Daily** (last 14 days), **Weekly** (last 8 weeks), and **Monthly** (last 6 months) to view Order Sales, Water Supply Sales, and Combined Revenue.
   - **Customer-wise Report**: View every customer's water jars consumed, orders count, total sales, amount paid, and pending due.
   - **Product-wise Report**: View every product's units sold, current stock, selling price, total revenue, and estimated profit.
3. Click **Export CSV** to download a spreadsheet file, or click **Print / PDF** to open a formatted printable report.

---

## 10. Handling Common Operational Errors

- **"Access token required" / Automatic Redirect to Sign-In**: Your 30-day session token expired or was cleared. Sign in again to resume.
- **"Customer Name, Phone number and Address are required"**: Ensure all three mandatory fields are filled before saving a customer.
- **No Orders Visible on All Orders Screen**: Check the filter bar at the top of **All Orders** and set Time Period, Customer, Delivery Status, and Payment Status to **All**, and clear the search input.
- **Customer Not Appearing on Route Map**: Open **Customers**, edit the customer record, and enter or capture their **Latitude** and **Longitude** coordinates.

