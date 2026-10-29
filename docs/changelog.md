# Changelog

All notable changes, bug fixes, security improvements, and documentation additions to the **Ocean Enterprises Business Management System** are recorded in this file.

---

## [1.4.0] — 2026-10-29 — Complete Documentation Suite & In-App Help Center (`/docs`)

### Added
- **GitHub Documentation Suite (`docs/`)**:
  - Created 15 project-specific documentation guides in `docs/` (`index.md`, `business-overview.md`, `features.md`, `user-guide.md`, `system-architecture.md`, `database-design.md`, `api-reference.md`, `authentication-and-security.md`, `local-development.md`, `environment-configuration.md`, `deployment-guide.md`, `testing-and-validation.md`, `troubleshooting.md`, `maintenance-and-recovery.md`, `changelog.md`) and updated `README.md`.
- **Website Help & Documentation Center (`/docs`)**:
  - Added [`client/src/pages/DocumentationCenter.jsx`](../client/src/pages/DocumentationCenter.jsx) and [`client/src/data/docsContent.js`](../client/src/data/docsContent.js).
  - Implemented URL-synced routing in [`client/src/App.jsx`](../client/src/App.jsx) supporting `/docs`, `/docs/getting-started`, `/docs/user-guide`, `/docs/features`, `/docs/troubleshooting`, and `/docs/faq`.
  - Added instant case-insensitive search across article titles, summaries, section headings, body text, and FAQs, with keyboard navigation, breadcrumbs, table of contents, previous/next article navigation, and responsive mobile drawer support.
  - Added **Help & Docs** navigation entry in [`client/src/components/Navigation.jsx`](../client/src/components/Navigation.jsx) and a direct **Help & Documentation** link on [`client/src/pages/Login.jsx`](../client/src/pages/Login.jsx).

---

## [1.3.0] — 2026-10-28 — Live Production Routing, Login Normalization & Dispatch Pipeline Fixes (`595fbdf`)

### Fixed
- **Health Endpoint Rewrite ([`vercel.json`](../vercel.json))**: Added `{ "source": "/health", "destination": "/api" }` so both `/api/health` and `/health` return live JSON health status in production.
- **Flexible Admin Login Identifier ([`server/routes/auth.js`](../server/routes/auth.js))**: Updated `POST /api/auth/login` to match exact email/phone first and fall back to normalized 10-digit Indian phone numbers (`9876543210` matching `+91 9876543210`) or account name (`Ocean Admin` / `admin`).
- **Live Dispatch Pipeline Breakdown ([`server/routes/dashboard.js`](../server/routes/dashboard.js), [`server/db/database.js`](../server/db/database.js))**: Updated `deliveryBreakdown` query to include all active pipeline orders (`New Order`, `Confirmed`, `Preparing`, `Out for Delivery`) in addition to today's orders.
- **All Orders Default Filter ([`client/src/pages/Orders.jsx`](../client/src/pages/Orders.jsx))**: Changed initial `timeFilter` state from `'Today'` to `'All'` so existing orders are immediately visible when opening **All Orders**.
- **Water Entry Partial Payment Normalization ([`server/routes/water.js`](../server/routes/water.js), [`server/routes/customers.js`](../server/routes/customers.js))**: Normalized numeric `paid_amount` and `remaining_amount` on water entries returned by `GET /api/water` and `GET /api/customers/:id`.

---

## [1.2.0] — 2026-10-28 — Neon PostgreSQL Production Persistence & Lint Cleanup (`1740d97`, `4e793a2`)

### Added
- Connected production environment to managed **Neon PostgreSQL** (`neondb`) with automated schema and seed migration ([`server/db/migrate.js`](../server/db/migrate.js)).
- Enhanced `GET /api/health` in [`api/index.js`](../api/index.js) and [`server/index.js`](../server/index.js) to perform a live `postgres.testConnection()` probe and report `storage`, `database_configured`, `database_connected`, and `persistent`.
- Added Suite 12 in [`test/suite.test.js`](../test/suite.test.js) covering `normalizeQuery` SQL translation, migration DDL verification, transaction rollback, and live PostgreSQL persistence.

### Fixed
- Fixed `PUT /api/customers/:id` and `PUT /api/products/:id` partial update `NOT NULL` handling on PostgreSQL.
- Fixed `water_entries` `paid_amount` column migration ordering in [`server/db/schema.postgres.sql`](../server/db/schema.postgres.sql).
- Cleaned up unused imports and variables across frontend components (`0` lint errors).

---

## [1.1.0] — 2026-10-28 — Partial Water Payments, Strict JWT Security & Ledger Integrity (`2381427`, `1203885`)

### Fixed
- **Partial Water Payments & FIFO Allocation**: Added `paid_amount` tracking to `water_entries` and updated `POST /api/payments`, `GET /api/customers`, `GET /api/customers/:id`, `GET /api/water/summary`, `GET /api/dashboard/stats`, and `GET /api/reports/customer-wise` to accurately calculate partial water payments.
- **Production JWT Security ([`server/middleware/auth.js`](../server/middleware/auth.js))**: Removed hardcoded JWT fallback secret in production and enforced `JWT_SECRET.length >= 16`.
- **Settings Endpoint Protection ([`server/routes/settings.js`](../server/routes/settings.js))**: Protected `GET /api/settings` with `authMiddleware` and added `GET /api/settings/public` for non-sensitive public branding.
- **Cancelled Order Stock Restoration ([`server/routes/orders.js`](../server/routes/orders.js), [`server/routes/deliveries.js`](../server/routes/deliveries.js))**: Restored product stock when orders are cancelled and prevented double stock restoration when deleting already-cancelled orders.

