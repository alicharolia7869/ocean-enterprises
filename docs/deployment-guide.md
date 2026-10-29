# Deployment Guide

This guide explains how the **Ocean Enterprises Business Management System** is built, configured, deployed, and verified on **Vercel** with a managed **Neon PostgreSQL** database.

---

## 1. Deployment Architecture Overview

Ocean Enterprises uses a unified monorepo deployment model configured in [`vercel.json`](../vercel.json):

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/health", "destination": "/api" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

1. **Static Frontend (`client/dist`)**:
   - Vercel executes `npm run build`, which runs `npm --prefix client install && npm run build --prefix client` and outputs optimized static assets to `client/dist`.
2. **Serverless API (`api/index.js`)**:
   - Vercel automatically compiles [`api/index.js`](../api/index.js) into a Node.js Serverless Function (`/api`).
   - All requests to `/api/*` and `/health` are routed to [`api/index.js`](../api/index.js).
   - All other paths (`/`, `/login`, `/dashboard`, `/docs`, `/docs/user-guide`, etc.) serve `client/dist/index.html`.

---

## 2. Pre-Deployment Checklist

Before deploying to production, verify the following prerequisites:

1. **PostgreSQL Database Provisioned**:
   - A persistent PostgreSQL database (such as Neon PostgreSQL) is created and reachable.
2. **Vercel Environment Variables Configured**:
   - `DATABASE_URL` is set for the **Production** (and **Preview**) environment.
   - `JWT_SECRET` (`>= 16` characters, 64-char hex recommended) is set for the **Production** (and **Preview**) environment.
3. **Database Schema & Seed Migration Applied**:
   - Run the idempotent migration script against the target database:
     ```bash
     npm run db:migrate
     ```
   - This applies [`server/db/schema.postgres.sql`](../server/db/schema.postgres.sql) (`CREATE TABLE IF NOT EXISTS ...` and `ALTER TABLE water_entries ADD COLUMN IF NOT EXISTS paid_amount ...`), inserts any missing initial records using `ON CONFLICT DO NOTHING`, and synchronizes PostgreSQL `SERIAL` sequences.
4. **Local Quality Gate Passed**:
   ```bash
   npm test
   npm --prefix client run lint
   npm --prefix client run build
   ```

---

## 3. Step-by-Step Deployment Procedure

### Method A: Git-Triggered Deployment (Standard)
When connected to the GitHub repository (`https://github.com/alicharolia7869/ocean-enterprises`):
1. Commit verified changes to your branch and merge/push to `main`.
2. Vercel automatically builds `npm run build` and deploys `api/index.js` + `client/dist`.

### Method B: Vercel CLI Deployment
From the repository root:
```bash
# Deploy a preview build
npx vercel

# Deploy to production (only when authorized and verified)
npx vercel --prod
```

---

## 4. Post-Deployment Smoke Tests & Verification

After any production deployment, run these non-destructive verification checks:

### 4.1 Verify Health & Database Persistence Status
```bash
curl -s https://ocean-enterprises.vercel.app/api/health
curl -s https://ocean-enterprises.vercel.app/health
```
Confirm that **both** endpoints return HTTP `200` with `application/json` and:
- `"status": "online"`
- `"storage": "postgresql"`
- `"database_configured": true`
- `"database_connected": true`
- `"persistent": true`

### 4.2 Verify SPA & Documentation Routes
Confirm that visiting the following URLs in a browser returns HTTP `200` and renders without console errors:
- `https://ocean-enterprises.vercel.app/`
- `https://ocean-enterprises.vercel.app/docs`
- `https://ocean-enterprises.vercel.app/docs/getting-started`
- `https://ocean-enterprises.vercel.app/docs/user-guide`
- `https://ocean-enterprises.vercel.app/docs/features`
- `https://ocean-enterprises.vercel.app/docs/troubleshooting`
- `https://ocean-enterprises.vercel.app/docs/faq`

### 4.3 Verify Authentication & Dashboard API
Sign in at `https://ocean-enterprises.vercel.app/` and confirm that:
- `POST /api/auth/login` returns `200 OK` with a valid JWT token.
- `GET /api/dashboard/stats` loads active KPIs and the Live Dispatch Pipeline.

---

## 5. Rollback & Recovery Procedure

If a deployment introduces a regression:
1. **Instant Rollback on Vercel**:
   - Open the **Vercel Dashboard -> Deployments**, select the previous known-good `READY` production deployment, and click **Instant Rollback** (or run `npx vercel rollback <deployment-url>`).
2. **Database Compatibility**:
   - Because all schema migrations in [`server/db/schema.postgres.sql`](../server/db/schema.postgres.sql) and [`server/db/migrate.js`](../server/db/migrate.js) are strictly additive and non-destructive (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`), rolling back the application code does not break existing database tables or records.

