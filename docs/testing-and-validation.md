# Testing & Validation Guide

This document details the automated test suite, frontend lint checks, build verification, and validation methodology for the **Ocean Enterprises Business Management System**.

---

## 1. Test Architecture Overview

Automated tests are implemented in [`test/suite.test.js`](../test/suite.test.js) using Node.js's built-in `node:test` runner and `node:assert/strict`.

### Safe Isolation Design
1. **Suites 1–11 (API, Auth, Financial Ledger, Inventory & Business Logic)**:
   - Before running (`test.before`), [`test/suite.test.js`](../test/suite.test.js) backs up [`server/data/ocean_store.json`](../server/data/ocean_store.json) in memory, temporarily unsets `DATABASE_URL` / `POSTGRES_URL` so suites 1–11 run against the isolated local store, and starts an ephemeral HTTP server on `127.0.0.1:0` (random free port).
   - After all suites finish (`test.after`), the server closes and [`server/data/ocean_store.json`](../server/data/ocean_store.json) is restored byte-for-byte from the backup.
2. **Suite 12 (PostgreSQL Adapter, SQL Normalization & Live Database Integration)**:
   - Verifies `postgres.normalizeQuery()` SQL dialect translation (`?` -> `$1`, `LIKE` -> `ILIKE`, `MAX(0, ...)` -> `GREATEST(0, ...)`, `date('now')` -> `CURRENT_DATE`, `strftime` -> `TO_CHAR`, `RETURNING`).
   - Verifies [`server/db/schema.postgres.sql`](../server/db/schema.postgres.sql) and [`server/db/migrate.js`](../server/db/migrate.js) DDL integrity.
   - When `DATABASE_URL` is configured (in `.env.local` / `.env` or environment), connects to the live PostgreSQL database, verifies all 9 tables, tests `postgres.transaction()` rollback safety, and runs a controlled end-to-end persistence check (`INSERT` customer -> `INSERT` water entry -> `INSERT` partial payment -> `SELECT` verification -> `DELETE` cleanup).

---

## 2. Running Validation Commands

### 2.1 Run Automated Backend & Database Tests
```bash
npm test
# Equivalent to: node --test test/suite.test.js
```

### 2.2 Run Frontend Static Analysis (Oxlint)
```bash
npm --prefix client run lint
```

### 2.3 Run Production Frontend Build
```bash
npm --prefix client run build
```

---

## 3. Breakdown of the 12 Automated Test Suites (`test/suite.test.js`)

| Suite # | Suite Name | Subtests | What Is Verified |
| :--- | :--- | :---: | :--- |
| **1** | System Health & Routing | 3 | `GET /api/health` (`200`), `GET /health` alias (`200`), unknown `/api/*` route (`404` JSON). |
| **2** | Authentication & Security | 9 | Missing credentials (`400`), unknown user (`401`), wrong password (`401`), valid email login (`200` + JWT), 10-digit phone (`9876543210`) & account name (`Ocean Admin`) login (`200`), missing token (`401`), malformed token (`401`), `GET /api/auth/me` (`200`), password change & revert (`PUT /api/auth/change-password`). |
| **3** | Dashboard Operations | 1 | `GET /api/dashboard/stats` structure, numeric KPIs, `lowStockProducts`, `recentOrders`, and `deliveryBreakdown`. |
| **4** | Customer Management | 6 | Validation on missing name (`400`), customer creation (`201`), `GET /api/customers/:id` ledger (`200`), partial & full update (`PUT /api/customers/:id`), GPS coordinate save (`POST /api/customers/:id/location`), customer list (`GET /api/customers`). |
| **5** | Product & Inventory Management | 4 | Product creation (`201`), stock `ADD` (`POST /api/products/:id/stock`), negative stock prevention (`REMOVE` clamped at `0`), stock `SET`. |
| **6** | Rapid Water Entry Workflow | 3 | Water entry creation (`201`) & automatic stock deduction, customer pending balance reflection, `GET /api/water` list & today stats. |
| **7** | Orders & WhatsApp Parsing | 6 | `POST /api/orders/parse-whatsapp` NLP extraction, multi-item order creation (`201`) & auto delivery creation, `GET /api/orders` filters (`Today`, `customerId`), order detail lookup, delivery status progression to `Delivered`, and order cancellation/deletion stock restoration & order number uniqueness. |
| **8** | Deliveries & Route Dispatch | 2 | `GET /api/deliveries` list and `PUT /api/deliveries/:id/status` sync with order status and driver notes. |
| **9** | Payment Allocation & Customer Balance | 4 | `GET /api/payments` `pendingCustomers`, order-linked payment settlement, water-entry settlement, and multi-step partial water payments (`₹350` entry -> `₹200` partial payment -> `₹150` due -> second `₹250` entry -> `₹300` FIFO payment -> `₹100` due -> final `₹100` settlement -> `₹0` due) across customer ledger, dashboard, water summary, and customer-wise reports. |
| **10** | Business Reports & Analytics | 3 | `GET /api/reports/sales` (`daily`, `weekly`, `monthly`), `GET /api/reports/customer-wise`, and `GET /api/reports/product-wise`. |
| **11** | Business Settings & Production Auth Security | 3 | `GET /api/settings` rejects unauthenticated calls (`401`) while `GET /api/settings/public` returns only public branding (`200`), authenticated `PUT /api/settings`, and production `JWT_SECRET` enforcement (rejecting missing or `< 16` char secrets). |
| **12** | PostgreSQL Adapter, Query Normalization & Migration SQL | 4 | `normalizeQuery` unit assertions, `schema.postgres.sql` & `migrate.js` SQL verification, safe failure when `DATABASE_URL` is missing, and live PostgreSQL connection, transaction rollback, and controlled persistence verification. |

---

## 4. Verification Status Summary

- **Tests that exist**: 12 suites containing 60 automated test cases in [`test/suite.test.js`](../test/suite.test.js) (plus documentation Center content & route integrity checks).
- **Tests executed & passed**: All automated tests pass (`0` failures), `npm --prefix client run lint` passes with `0` errors (`15` non-blocking React compiler optimization hints on `useEffect` data-fetching hooks), and `npm --prefix client run build` succeeds cleanly.
- **Unverified / Out-of-Scope Areas**: Automated browser E2E tests for external third-party tabs (`wa.me` WhatsApp Web and `google.com/maps`) are verified up to deep-link URL construction rather than automating external third-party domains.

