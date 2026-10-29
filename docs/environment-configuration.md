# Environment Configuration

This document catalogs all environment variables supported by the **Ocean Enterprises Business Management System**, their purpose, validation rules, and safe configuration across local development and Vercel deployments.

---

## 1. Environment File Loading Order

In [`api/index.js`](../api/index.js), [`server/index.js`](../server/index.js), and [`server/db/migrate.js`](../server/db/migrate.js), `dotenv` (`^17.4.2`) loads environment files in the following priority order when `NODE_ENV !== 'test'`:

1. Process environment variables already injected by the host (e.g., Vercel Environment Variables).
2. `.env.local` in the repository root.
3. `.env` in the repository root.

> **Security Rule**: Never commit `.env` or `.env.local` to version control. Use [`.env.example`](../.env.example) as the template.

---

## 2. Environment Variables Reference

| Variable Name | Required? | Default (Local Dev) | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Required in Production** *(Optional locally)* | `""` (Falls back to `server/data/ocean_store.json`) | Primary PostgreSQL connection URI (`postgresql://user:pass@host/db?sslmode=require`). |
| `POSTGRES_URL` | Optional alias | `""` | Secondary fallback variable checked by [`server/db/postgres.js`](../server/db/postgres.js) if `DATABASE_URL` is not set. |
| `JWT_SECRET` | **Required in Production** | Local dev fallback string (warns once) | Secret key used to sign and verify 30-day JWT tokens. **Must be at least 16 characters in production** (64-character hex recommended). |
| `NODE_ENV` | Recommended | `'development'` | Runtime mode (`'development'`, `'production'`, or `'test'`). When set to `'production'` (or when `VERCEL` is present), strict `JWT_SECRET` validation is enforced. |
| `PORT` | Optional | `5000` | TCP port on which the standalone Express server ([`server/index.js`](../server/index.js)) listens. |
| `PG_MAX_CONNECTIONS` | Optional | `5` on Vercel / Lambda; `10` locally | Maximum number of clients in the PostgreSQL connection pool (`server/db/postgres.js`). |
| `PGSSLMODE` | Optional | Auto-enabled for remote hosts | Set to `'disable'` only when connecting to a local/private PostgreSQL instance without TLS. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Optional | `'true'` (unless `sslmode=no-verify`) | Set to `'false'` only if using a self-signed PostgreSQL certificate without a CA bundle. |
| `PGSSLROOTCERT` | Optional | `undefined` | Filesystem path to a custom root CA certificate file (`.crt` / `.pem`) for PostgreSQL TLS verification. |

---

## 3. Safe `.env` Template

Below is the safe template from [`.env.example`](../.env.example):

```dotenv
# =============================================================================
# Ocean Enterprises — Environment Variables Configuration
# =============================================================================

# Server Port (Local development)
PORT=5000

# Environment Mode ('development' | 'production')
NODE_ENV=development

# JSON Web Token Secret (Required in production)
# In production, use a strong 256-bit random string (e.g. generated via: openssl rand -hex 32)
JWT_SECRET=your_secure_random_jwt_secret_here

# PostgreSQL Persistent Database Connection String
# Compatible with Neon, Supabase, AWS RDS, or standard PostgreSQL.
DATABASE_URL=postgresql://user:password@host:5432/ocean_db?sslmode=require
```

---

## 4. Configuring Environment Variables in Vercel

When deploying to Vercel (`https://ocean-enterprises.vercel.app/`), configure variables in **Vercel Dashboard -> Project Settings -> Environment Variables** across `Production`, `Preview`, and `Development`:

1. **`DATABASE_URL`**:
   - Paste your pooled or direct Neon PostgreSQL connection string starting with `postgresql://`.
   - [`server/db/postgres.js`](../server/db/postgres.js) automatically strips incompatible URL query parameters (`channel_binding`, `sslmode`) when constructing the `pg.Pool` SSL object so Neon and Supabase connection strings work out of the box.
2. **`JWT_SECRET`**:
   - Set a cryptographically random string of at least 32 bytes (64 hex characters).
   - If `JWT_SECRET` is missing or shorter than 16 characters in Vercel, `POST /api/auth/login` and all protected routes will safely refuse to operate and return `503 Service Unavailable`.

