# Troubleshooting Guide

This guide provides root causes and step-by-step solutions for common operational, authentication, database, and deployment issues in the **Ocean Enterprises Business Management System**.

---

## 1. Sign-In & Authentication Issues

### Symptom 1.1: `401 Unauthorized — "Invalid credentials. Please check your email/phone."`
- **Cause**: The identifier entered does not match any registered user's email, phone number, or account name.
- **Resolution**:
  - Sign in using one of the supported formats for the administrator account:
    - **Email**: `admin@ocean.com`
    - **Phone**: `9876543210` or `+91 9876543210`
    - **Account Name**: `Ocean Admin` (or `admin`)
  - If running locally for the first time and the user table is empty, run `npm run seed` (for JSON mode) or `npm run db:migrate` (for PostgreSQL mode).

### Symptom 1.2: `401 Unauthorized — "Invalid password. Please try again."`
- **Cause**: The password entered does not match the bcrypt hash stored in `users.password_hash`.
- **Resolution**:
  - Verify Caps Lock and trailing spaces.
  - Default local seed password is `admin123`.
  - If the administrator password was changed and forgotten in a local development environment, re-run `npm run seed` to reset the local store, or update `users.password_hash` in PostgreSQL with a fresh `bcryptjs` hash (`bcrypt.hashSync('new_password', 10)`).

### Symptom 1.3: `503 Service Unavailable — "Authentication service is not configured. Please set a strong JWT_SECRET in production."`
- **Cause**: In production (`NODE_ENV=production` or on Vercel), [`server/middleware/auth.js`](../server/middleware/auth.js) requires `JWT_SECRET` to be explicitly set and at least **16 characters long**.
- **Resolution**:
  1. Open **Vercel Dashboard -> Project Settings -> Environment Variables**.
  2. Add `JWT_SECRET` with a strong random string (e.g., 64 hex characters generated via `openssl rand -hex 32`) for `Production` and `Preview`.
  3. Redeploy the project so the serverless function receives the updated environment variable.

---

## 2. Database & Persistence Issues

### Symptom 2.1: Data Resets After a Few Minutes in Production
- **Cause**: `DATABASE_URL` is not configured in the Vercel environment, causing the serverless function to fall back to `/tmp/ocean_store.json` (`"storage": "ephemeral-json"`), which is wiped whenever the serverless container recycles.
- **Diagnostic Check**:
  Open `https://ocean-enterprises.vercel.app/api/health`.
  - If `"storage"` is `"ephemeral-json"` or `"persistent"` is `false`, PostgreSQL is not active.
- **Resolution**:
  1. Set `DATABASE_URL` (`postgresql://...`) in Vercel Environment Variables.
  2. Run `npm run db:migrate` against that `DATABASE_URL` to create the 9 PostgreSQL tables and seed initial records.
  3. Redeploy and confirm `GET /api/health` returns `"storage": "postgresql"`, `"database_connected": true`, and `"persistent": true`.

### Symptom 2.2: `GET /api/health` Returns `"status": "degraded"` and `"database_connected": false`
- **Cause**: `DATABASE_URL` is set, but `postgres.testConnection()` failed to reach the PostgreSQL host (e.g., invalid password, paused Neon compute endpoint, or firewall/SSL mismatch).
- **Resolution**:
  1. Verify that the `DATABASE_URL` credentials and hostname are valid.
  2. If using a local PostgreSQL server that does not support SSL, append `?sslmode=disable` to `DATABASE_URL` or set `PGSSLMODE=disable`.

---

## 3. Orders, Deliveries & UI Filter Issues

### Symptom 3.1: "No orders match the selected filters." on All Orders Page
- **Cause**: One or more filter dropdowns (**Time Period**, **Customer**, **Delivery Status**, **Payment Status**) or the **Search** input is filtering out existing orders.
- **Resolution**:
  - Set **Time Period** to `All Time`, **Customer** to `All Customers`, **Delivery Status** to `All Delivery Status`, **Payment Status** to `All Payment Status`, and clear the search box.

### Symptom 3.2: Delivery Stop Does Not Appear as a Pin on the Interactive Route Map
- **Cause**: The Interactive Route Map ([`client/src/pages/DeliveryRoute.jsx`](../client/src/pages/DeliveryRoute.jsx)) only plots pins for deliveries that have non-null `latitude` and `longitude` coordinates. Stops without coordinates appear in the right-hand Stop Sequence list with a `No GPS` badge.
- **Resolution**:
  1. Open **Customers** from the sidebar.
  2. Click **Edit** on the customer record.
  3. Click **Capture Live Phone GPS** (or enter Latitude and Longitude manually) and click **Save Customer**.

### Symptom 3.3: WhatsApp Parser Shows `LOW` Confidence or Does Not Detect an Item
- **Cause**: The message text did not contain a recognized product keyword (`20l`, `water`, `jar`, `1l`, `500ml water`, `frooti 1.2`, `frooti 600`, `frooti 300`, `frooti 160`, `appy fizz`, `thums up`, `litchi`, `guava`).
- **Resolution**:
  - Include standard product names and numeric quantities (e.g., `5 x 20L water, 3 Thums Up, 2 Appy Fizz`), or create the order directly using **All Orders -> + Create Order** where every catalog SKU is selectable from a dropdown.

---

## 4. Local Development & Build Issues

### Symptom 4.1: `Vite proxy error: connect ECONNREFUSED 127.0.0.1:5000`
- **Cause**: The Vite frontend dev server (`npm run dev:client` on port `3000`) is running, but the Express backend server (`npm start` on port `5000`) is not running.
- **Resolution**: Start the backend server in a separate terminal with `npm start`.

### Symptom 4.2: Browser Blocks Popup When Clicking "Print Statement" or "WhatsApp"
- **Cause**: The browser's popup blocker prevented `window.open(..., '_blank')`.
- **Resolution**: Allow popups for `https://ocean-enterprises.vercel.app` (or `http://localhost:5000`) in your browser address bar settings.

