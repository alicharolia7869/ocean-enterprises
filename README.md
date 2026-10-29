# Ocean Enterprises — Business Management System

**Water Supply & Beverage Distribution Operations Platform**

- **Production Website**: [https://ocean-enterprises.vercel.app/](https://ocean-enterprises.vercel.app/)
- **In-App Help & Documentation Center**: [https://ocean-enterprises.vercel.app/docs](https://ocean-enterprises.vercel.app/docs)
- **GitHub Repository**: [https://github.com/alicharolia7869/ocean-enterprises](https://github.com/alicharolia7869/ocean-enterprises)

---

## 1. Project Purpose & Business Context

**Ocean Enterprises** is a packaged drinking water supply plant (20L refillable jars, 1L and 500ml bottled water) and wholesale cold-beverage distributor (Frooti, Appy Fizz, Thums Up, Smoodh, B Fizz) operating out of Jogeshwari (West), Mumbai.

Daily plant and distribution operations involve high-frequency transactions across restaurants, corporate offices, retail shops, and residential accounts:
- **Rapid dockside & van water jar drops** that must be logged in seconds without creating multi-step invoices.
- **Unstructured WhatsApp orders** sent by shopkeepers and restaurant managers (`"2 water bottles, 3 Thums Up, 2 Appy Fizz"`).
- **Multi-stage dispatch and route management** with GPS stop pins and turn-by-turn Google Maps navigation for delivery drivers.
- **Credit & partial-payment tracking**, where customers receive daily water jars or beverage cases and settle balances partially or monthly via Cash, UPI, Bank Transfer, or Cheque.

The **Ocean Enterprises Business Management System** provides a unified web workspace for plant administrators and dispatch operators to manage these workflows end-to-end.

---

## 2. Verified Technology Stack

Every technology listed below is verified directly from [`package.json`](package.json), [`client/package.json`](client/package.json), [`vercel.json`](vercel.json), and [`api/index.js`](api/index.js):

| Layer | Technology | Version / Details |
| :--- | :--- | :--- |
| **Frontend UI** | React + React DOM | `^19.2.8` (SPA with state-driven workspace tabs and URL-synced `/docs` center) |
| **Frontend Build & Dev** | Vite + `@vitejs/plugin-react` | Vite `^8.2.2`, `@vitejs/plugin-react` `^6.1.0` |
| **Icons & Typography** | `lucide-react` + Google Fonts | `lucide-react` `^1.41.0`; `Outfit` & `Plus Jakarta Sans` |
| **Maps & Geolocation** | Leaflet (CDN) + Browser Geolocation API | Leaflet `1.9.4` (OpenStreetMap tiles) + Google Maps deep links |
| **Frontend Linter** | Oxlint | `^1.79.0` (`npm --prefix client run lint`) |
| **Backend Runtime & Framework** | Node.js + Express | Node.js `v20+` / `v24.x`, Express `^5.2.1` |
| **Database (Production)** | PostgreSQL (`pg`) | `pg` `^8.23.1` connected to managed Neon PostgreSQL via `DATABASE_URL` |
| **Database (Local Fallback)** | JSON Document Store Adapter | [`server/db/database.js`](server/db/database.js) (`server/data/ocean_store.json`) when `DATABASE_URL` is unset |
| **Authentication** | JWT + bcryptjs | `jsonwebtoken` `^9.0.3` (30-day Bearer tokens) + `bcryptjs` `^3.0.3` |
| **Hosting & Serverless API** | Vercel | Static Vite build (`client/dist`) + Serverless Express entry ([`api/index.js`](api/index.js)) |
| **Automated Testing** | Node.js Built-in Test Runner | `node --test test/suite.test.js` (60 automated integration & unit tests) |

---

## 3. Implemented Features

1. **Operations & Distribution Command Dashboard** (`Dashboard.jsx`, `GET /api/dashboard/stats`)
   - Live counters for Today's Total Orders, 20L Water Jars Delivered, Beverage Orders/Units, Pending Deliveries, Completed Deliveries Today, Pending Payments, Today's Revenue, and Monthly Revenue.
   - **Live Dispatch Pipeline** breakdown (`New Order`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`).
   - Quick-action launcher grid, active orders status selector, and low-stock inventory alert panel.
2. **10-Second Rapid Water Supply Entry** (`WaterEntry.jsx`, `/api/water`, `/api/water/summary`)
   - Searchable customer selector, tactile quantity increment buttons (`+1`, `+2`, `+5`, `+10`, `Reset`), customizable jar rate (default `₹35`), `Paid` / `Pending` toggle, payment mode selector, automatic inventory deduction, and 1-click WhatsApp receipt dispatch.
   - Monthly Customer Water Summary table with per-customer jar counts, billed totals, paid amounts, and pending dues.
3. **WhatsApp Order Processing Engine** (`WhatsAppOrders.jsx`, `POST /api/orders/parse-whatsapp`)
   - Rule-based keyword and regular-expression parser that extracts customer identity, catalog products, and quantities from unstructured WhatsApp messages, calculates line subtotals, and creates structured orders with 1 click.
   - Pre-formatted WhatsApp deep-link generators for Order Confirmation, Out for Delivery, Delivered, Payment Reminder, and Shareable Order Catalog Template.
4. **Delivery Management Board & Interactive Route Map** (`Deliveries.jsx`, `DeliveryRoute.jsx`, `/api/deliveries`)
   - Stop sequence ordering (`route_sequence`) with up/down reordering controls, status progression (`New Order` -> `Confirmed` -> `Preparing` -> `Out for Delivery` -> `Delivered`), and driver notes.
   - Interactive Leaflet + OpenStreetMap route map with numbered stop markers, dashed route polylines, and 1-click Google Maps turn-by-turn navigation.
5. **Customer Directory, GPS Pinning & Monthly Ledgers** (`Customers.jsx`, `/api/customers`)
   - Categorized customer records (`Restaurant`, `Shop`, `Office`, `Residential`) with live HTML5 GPS coordinate capture, full order/water/payment history modal, monthly financial ledger, and printable statements.
6. **Payment & Receivables Management** (`Payments.jsx`, `/api/payments`)
   - Supports full and partial payments linked to a specific order, a specific water entry, or automatically allocated **FIFO** (oldest unpaid orders first, then oldest unpaid water entries) inside a database transaction.
   - Pending receivables sidebar with 1-click WhatsApp payment reminders containing the configured business UPI ID.
7. **All Orders Management** (`Orders.jsx`, `/api/orders`)
   - Multi-item manual order creation, time/status/payment/customer filters, CSV export, status updates, payment recording, and order cancellation/deletion with automatic inventory restoration.
8. **Product Catalog & Stock Control** (`Products.jsx`, `/api/products`)
   - Water and Beverage SKU management, cost vs. selling price margin display, `ADD` / `REMOVE` / `SET` stock adjustments (clamped at zero), and low-stock threshold alerts.
9. **Business Reports & Exports** (`Reports.jsx`, `/api/reports/*`)
   - Daily (14 days), Weekly (8 weeks), and Monthly (6 months) sales reports, Customer-wise financial ledgers, and Product-wise profitability reports with CSV export and print-ready statements.
10. **Business Configuration & Security Settings** (`Settings.jsx`, `/api/settings`, `/api/auth/change-password`)
    - Manage company profile, phone, WhatsApp number, warehouse address, UPI ID, and administrator password.
11. **In-App Help & Documentation Center** (`DocumentationCenter.jsx`, `/docs`)
    - Built-in searchable documentation center accessible at `/docs` (with subroutes `/docs/getting-started`, `/docs/user-guide`, `/docs/features`, `/docs/troubleshooting`, and `/docs/faq`) from both the login screen and the main workspace navigation.

---

## 4. Repository Structure

```text
Ocean/
├── api/
│   └── index.js                  # Vercel serverless Express entry point (/api/* and /health)
├── client/                       # React 19 + Vite frontend application
│   ├── public/                   # Static assets and SVG icons
│   ├── src/
│   │   ├── components/           # Navigation.jsx, GlobalSearchModal.jsx
│   │   ├── context/              # AuthContext.jsx (JWT session management)
│   │   ├── data/                 # Structured documentation content for /docs help center
│   │   ├── pages/                # 11 operational pages + Login.jsx + DocumentationCenter.jsx
│   │   ├── services/             # api.js (centralized fetch client)
│   │   ├── utils/                # whatsapp.js, maps.js, export.js
│   │   ├── App.jsx               # Main workspace state router & /docs URL router
│   │   ├── index.css             # Design tokens, responsive layout, component styles
│   │   └── main.jsx              # React DOM root mount
│   ├── index.html                # HTML shell, Google Fonts, Leaflet 1.9.4 CDN
│   ├── package.json              # Frontend scripts and dependencies
│   └── vite.config.js            # Vite dev server (port 3000) & /api proxy to port 5000
├── docs/                         # Complete developer & operational documentation suite
│   ├── index.md
│   ├── business-overview.md
│   ├── features.md
│   ├── user-guide.md
│   ├── system-architecture.md
│   ├── database-design.md
│   ├── api-reference.md
│   ├── authentication-and-security.md
│   ├── local-development.md
│   ├── environment-configuration.md
│   ├── deployment-guide.md
│   ├── testing-and-validation.md
│   ├── troubleshooting.md
│   ├── maintenance-and-recovery.md
│   └── changelog.md
├── server/                       # Node.js + Express 5 backend
│   ├── data/
│   │   └── ocean_store.json      # Local JSON fallback data store
│   ├── db/
│   │   ├── database.js           # Dual-mode adapter (PostgreSQL primary / JSON fallback)
│   │   ├── postgres.js           # pg Pool manager, SQL dialect normalizer, transactions
│   │   ├── migrate.js            # Idempotent PostgreSQL schema + seed migration runner
│   │   ├── schema.postgres.sql   # Production PostgreSQL DDL (9 tables + indexes)
│   │   ├── schema.sql            # Reference SQLite DDL
│   │   └── seed.js               # Demo/initial data seed script
│   ├── middleware/
│   │   └── auth.js               # JWT verification & role authorization middleware
│   ├── routes/                   # 10 Express routers (auth, dashboard, customers, etc.)
│   └── index.js                  # Standalone Express server (port 5000) + SPA static host
├── test/
│   └── suite.test.js             # Automated Node.js test suite (12 suites, 60 tests)
├── .env.example                  # Safe template for environment variables
├── package.json                  # Root backend dependencies and npm scripts
├── README.md                     # Project overview and quick start
└── vercel.json                   # Vercel build and URL rewrite configuration
```

---

## 5. Quick Start (Local Development)

### Prerequisites
- **Node.js**: `v20.x` or later (`v24.x` supported and tested)
- **npm**: `v9.x` or later
- **PostgreSQL** *(optional for local dev; required for production persistence)*: Any standard PostgreSQL 14+ instance or Neon serverless database. When `DATABASE_URL` is omitted locally, the server automatically uses `server/data/ocean_store.json`.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/alicharolia7869/ocean-enterprises.git
cd ocean-enterprises

# Install root backend dependencies
npm install

# Install frontend dependencies
npm --prefix client install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (or `.env.local`) and set your local values:
```bash
cp .env.example .env
```
See [`docs/environment-configuration.md`](docs/environment-configuration.md) for full details on `PORT`, `NODE_ENV`, `JWT_SECRET`, and `DATABASE_URL`.

### 3. Initialize / Seed Data (Optional)
- **Local JSON store**: `npm run seed` populates `server/data/ocean_store.json` with initial catalog products, sample customers, and the default admin user.
- **PostgreSQL database**: If `DATABASE_URL` is configured, run `npm run db:migrate` to apply [`server/db/schema.postgres.sql`](server/db/schema.postgres.sql) and migrate seed records non-destructively.

### 4. Run in Development Mode
You can run the backend on port `5000` and the Vite dev server (with `/api` proxy) on port `3000`:
```bash
# Terminal 1: Start Express API server on http://localhost:5000
npm start

# Terminal 2: Start Vite frontend dev server on http://localhost:3000
npm run dev:client
```
Alternatively, build the frontend once and serve everything from the Express server on `http://localhost:5000`:
```bash
npm run build
npm start
```

---

## 6. Testing, Linting & Production Build

All commands below are verified against [`package.json`](package.json) and [`client/package.json`](client/package.json):

```bash
# Run the automated backend & database test suite
npm test

# Run frontend lint checks (oxlint)
npm --prefix client run lint

# Build the production frontend bundle into client/dist
npm --prefix client run build
```

---

## 7. Deployment Overview

Ocean Enterprises is configured for zero-config deployment on **Vercel** via [`vercel.json`](vercel.json) and [`api/index.js`](api/index.js):
1. **Build Command**: `npm run build` (installs `client` dependencies and runs `vite build` into `client/dist`).
2. **Serverless API**: Requests matching `/api/(.*)` and `/health` are routed to [`api/index.js`](api/index.js).
3. **SPA Routing**: All other routes (including `/docs` and `/docs/*`) are served by `client/dist/index.html`.
4. **Required Production Environment Variables**:
   - `DATABASE_URL`: PostgreSQL connection string (`postgresql://...`).
   - `JWT_SECRET`: Strong random secret (`>= 16` characters; 256-bit hex recommended).

See [`docs/deployment-guide.md`](docs/deployment-guide.md) for complete step-by-step instructions, health check verification, and rollback procedures.

---

## 8. Complete Documentation Index

All detailed project documentation is located in the [`docs/`](docs/) directory:

- **[Documentation Home (`docs/index.md`)](docs/index.md)** — Central map of all guides and references.
- **[Business Overview (`docs/business-overview.md`)](docs/business-overview.md)** — Real-world water & beverage distribution workflows and how the software models them.
- **[Feature Inventory (`docs/features.md`)](docs/features.md)** — Detailed specification, validation rules, and verification status of every implemented feature.
- **[User Guide (`docs/user-guide.md`)](docs/user-guide.md)** — Step-by-step operator instructions for every screen in the application.
- **[System Architecture (`docs/system-architecture.md`)](docs/system-architecture.md)** — Component architecture, request lifecycles, and Mermaid diagrams.
- **[Database Design (`docs/database-design.md`)](docs/database-design.md)** — PostgreSQL relational schema, dual-mode JSON adapter, ER diagram, and FIFO ledger rules.
- **[API Reference (`docs/api-reference.md`)](docs/api-reference.md)** — Complete endpoint-by-endpoint contract for all 10 REST route modules and health checks.
- **[Authentication & Security (`docs/authentication-and-security.md`)](docs/authentication-and-security.md)** — JWT lifecycle, secret enforcement, password hashing, and access control.
- **[Local Development (`docs/local-development.md`)](docs/local-development.md)** — Setup, scripts, dual-server workflow, and debugging tips.
- **[Environment Configuration (`docs/environment-configuration.md`)](docs/environment-configuration.md)** — Reference for all supported environment variables across local and Vercel environments.
- **[Deployment Guide (`docs/deployment-guide.md`)](docs/deployment-guide.md)** — Vercel configuration, PostgreSQL provisioning, migrations, and smoke tests.
- **[Testing & Validation (`docs/testing-and-validation.md`)](docs/testing-and-validation.md)** — Breakdown of automated test suites, lint checks, and validation coverage.
- **[Troubleshooting (`docs/troubleshooting.md`)](docs/troubleshooting.md)** — Solutions for sign-in errors, database connectivity, missing orders, and build issues.
- **[Maintenance & Recovery (`docs/maintenance-and-recovery.md`)](docs/maintenance-and-recovery.md)** — Database backups, sequence synchronization, stock audits, and disaster recovery.
- **[Changelog (`docs/changelog.md`)](docs/changelog.md)** — Chronological history of features, bug fixes, and architectural improvements.

---

## 9. Known Limitations & Verification Status

- **Single-Role Workspace UI**: Although the backend database schema (`users.role`) and middleware (`requireRole`) support role strings, all protected API endpoints currently require `authMiddleware` (any valid signed-in user) and the UI provides a unified administrator/operator workspace rather than separate driver-only screens.
- **WhatsApp Integration Mode**: Outbound WhatsApp notifications (`utils/whatsapp.js`) use `https://wa.me/` deep links that open WhatsApp Web or the mobile WhatsApp app with pre-formatted messages so the operator can click Send; the system does not use a paid WhatsApp Business Cloud API webhook for automated background sending.
- **Route Optimization**: Delivery stop sequences (`route_sequence`) are reordered manually via up/down controls on the Delivery Management Board rather than an external paid travelling-salesperson (TSP) routing API.
- **Verification Status**: All 60 automated tests in `test/suite.test.js`, frontend `oxlint` checks (`0` errors), and the Vite production build (`client/dist`) are verified and passing.
