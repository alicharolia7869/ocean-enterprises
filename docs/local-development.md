# Local Development Guide

This guide covers setting up, running, linting, building, and testing the **Ocean Enterprises Business Management System** on a local development machine.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v24.x` (verified with Node.js `v24.18.0`)
- **npm**: `v9.x` or later
- **Git**: For cloning and branch management
- **PostgreSQL** *(Optional locally)*: If `DATABASE_URL` is not set in `.env`, the backend automatically runs against the local JSON document store at [`server/data/ocean_store.json`](../server/data/ocean_store.json).

---

## 2. Installation

Clone the repository and install both root (backend) and `client` (frontend) dependencies:

```bash
git clone https://github.com/alicharolia7869/ocean-enterprises.git
cd ocean-enterprises

# 1. Install backend dependencies (express, pg, jsonwebtoken, bcryptjs, cors, dotenv)
npm install

# 2. Install frontend dependencies (react, react-dom, lucide-react, vite, oxlint)
npm --prefix client install
```

---

## 3. Verified `npm` Scripts Reference

### Root `package.json` Scripts
| Script | Command Executed | Purpose |
| :--- | :--- | :--- |
| `npm start` | `node server/index.js` | Starts the Express backend server (and serves `client/dist` if built) on `PORT` (default `5000`). |
| `npm run dev:client` | `npm run dev --prefix client` | Starts the Vite frontend development server with HMR on `http://localhost:3000`. |
| `npm run build` | `npm --prefix client install && npm run build --prefix client` | Installs frontend packages and builds the production bundle into `client/dist`. |
| `npm run seed` | `node server/db/seed.js` | Resets and seeds `server/data/ocean_store.json` (or PostgreSQL if configured) with initial products, sample customers, and the default admin account. |
| `npm run migrate` / `npm run db:migrate` | `node server/db/migrate.js` | Applies [`server/db/schema.postgres.sql`](../server/db/schema.postgres.sql) to the configured PostgreSQL database and migrates records idempotently. |
| `npm test` | `node --test test/suite.test.js` | Runs the 60 automated unit and integration tests using Node's native test runner. |

### Frontend `client/package.json` Scripts
| Script | Command Executed | Purpose |
| :--- | :--- | :--- |
| `npm --prefix client run dev` | `vite` | Launches Vite dev server on port `3000` with `/api` proxy to `http://localhost:5000`. |
| `npm --prefix client run build` | `vite build` | Bundles React application into `client/dist`. |
| `npm --prefix client run lint` | `oxlint` | Runs fast static analysis across `client/src`. |
| `npm --prefix client run preview` | `vite preview` | Previews the production `client/dist` build locally. |

---

## 4. Running the Application Locally

### Option A: Dual-Server Development Mode (Recommended for UI Editing)
Run the Express API server and Vite dev server in two terminals. Vite ([`client/vite.config.js`](../client/vite.config.js)) automatically proxies `/api` requests from `http://localhost:3000` to `http://localhost:5000`:

```bash
# Terminal 1 — Backend API on port 5000
npm start

# Terminal 2 — Vite HMR Frontend on port 3000
npm run dev:client
```
Open **`http://localhost:3000`** in your browser.

### Option B: Single-Server Production Preview Mode
Build the frontend static bundle once and let Express ([`server/index.js`](../server/index.js)) serve both the frontend SPA and `/api/*` on port `5000`:

```bash
npm run build
npm start
```
Open **`http://localhost:5000`** in your browser.

---

## 5. Choosing Between Local JSON Store and PostgreSQL

### Mode 1: Local JSON Store (Zero-Setup Default)
- Leave `DATABASE_URL` commented out or unset in `.env`.
- All reads and writes persist to [`server/data/ocean_store.json`](../server/data/ocean_store.json).
- To reset demo data at any time:
  ```bash
  npm run seed
  ```

### Mode 2: Local or Cloud PostgreSQL
- Set `DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require` in `.env` or `.env.local`.
- Run the non-destructive migration and seed tool:
  ```bash
  npm run db:migrate
  ```
- Verify connectivity at `http://localhost:5000/api/health` (confirm `"storage": "postgresql"` and `"database_connected": true`).

---

## 6. Default Local Development Credentials

When seeded via [`server/db/seed.js`](../server/db/seed.js):
- **Email**: `admin@ocean.com`
- **Phone**: `9876543210` (or `+91 9876543210`)
- **Account Name**: `Ocean Admin`
- **Password**: `admin123`

*(In Vite development mode, clicking **⚡ Auto-fill Default Admin** on the Sign-In card populates `admin@ocean.com` and `admin123` automatically.)*

