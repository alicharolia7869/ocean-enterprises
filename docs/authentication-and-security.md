# Authentication & Security

This document describes the authentication architecture, JWT token lifecycle, production secret enforcement, password storage, and security controls implemented in the **Ocean Enterprises Business Management System**.

---

## 1. Authentication Flow & Token Lifecycle

1. **Credential Submission (`POST /api/auth/login`)**:
   - The client submits `{ emailOrPhone, password }` to [`server/routes/auth.js`](../server/routes/auth.js).
   - The server trims the identifier and resolves the user account by:
     1. Exact email or phone lookup (`WHERE email = ? OR phone = ?`), or
     2. Case-insensitive email, account name (`Ocean Admin` / `admin`), or normalized trailing 10-digit phone number match (allowing Indian mobile numbers to match whether entered as `9876543210`, `919876543210`, or `+91 9876543210`).
2. **Password Verification**:
   - Passwords are never stored in plaintext. [`server/routes/auth.js`](../server/routes/auth.js) verifies the submitted password against `users.password_hash` using `bcrypt.compare(password, user.password_hash)` (`bcryptjs` `^3.0.3`).
3. **JWT Issuance**:
   - Upon verification, the server signs a JSON Web Token (`jsonwebtoken` `^9.0.3`) with payload:
     ```json
     {
       "id": 1,
       "name": "Ocean Admin",
       "email": "admin@ocean.com",
       "role": "admin"
     }
     ```
   - Token expiration is set to `30d` (`expiresIn: '30d'`).
   - The response returns `{ message, token, user }` with `password_hash` strictly omitted.
4. **Client Session Persistence (`client/src/context/AuthContext.jsx`)**:
   - The frontend stores the token in `localStorage.getItem('ocean_token')` and user metadata in `localStorage.getItem('ocean_user')`.
   - On initial app load, `AuthContext` calls `GET /api/auth/me` to verify the token with the backend before granting workspace access.
   - Any `401 Unauthorized` response from any `/api/*` endpoint automatically clears `ocean_token` and `ocean_user` and returns the user to the Sign-In screen.

---

## 2. Production `JWT_SECRET` Enforcement (`server/middleware/auth.js`)

[`server/middleware/auth.js`](../server/middleware/auth.js) enforces strict separation between local development and production environments:

- **Production Detection**:
  ```js
  function isProductionEnv() {
    return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  }
  ```
- **No Hardcoded Fallback in Production**:
  - If `isProductionEnv()` is `true` and `process.env.JWT_SECRET` is missing or empty, `getJwtSecret()` throws `ERR_MISSING_JWT_SECRET` and returns HTTP `503 Service Unavailable` (`"Authentication service is not configured. Please set a strong JWT_SECRET in production."`).
  - If `isProductionEnv()` is `true` and `process.env.JWT_SECRET.trim().length < 16`, `getJwtSecret()` throws `ERR_WEAK_JWT_SECRET` and returns HTTP `503 Service Unavailable`.
- **Local Development Convenience**:
  - Only when both `NODE_ENV !== 'production'` and `process.env.VERCEL` is unset will a missing `JWT_SECRET` log a one-time console warning and use a local-only development secret.

---

## 3. Route Protection & Access Control

### 3.1 Protected vs. Public Endpoints
Every backend API route is protected by `authMiddleware` except for four explicitly public endpoints:
1. `POST /api/auth/login` — User sign-in.
2. `GET /api/health` and `GET /health` — Health & database connectivity status (exposes boolean flags and status strings only; never exposes connection strings, hostnames, or credentials).
3. `GET /api/settings/public` — Exposes only the non-sensitive `business_name` and `currency` keys from `business_settings`.

Full business settings (`GET /api/settings` and `PUT /api/settings`, which include phone numbers, WhatsApp handles, and UPI IDs) require `authMiddleware`.

### 3.2 Role-Based Middleware (`requireRole`)
[`server/middleware/auth.js`](../server/middleware/auth.js) exports `requireRole(...roles)`, which checks `req.user.role` and returns `403 Forbidden` if the authenticated user's role is not in the allowed list.

---

## 4. HTTP Security Headers & Error Sanitization

In both [`api/index.js`](../api/index.js) and [`server/index.js`](../server/index.js):
- `app.disable('x-powered-by')` removes the `X-Powered-By: Express` header.
- Every response includes:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Global error handlers log only `err.message` to server logs and return a generic `{"error": "Internal server error"}` JSON response, ensuring stack traces, SQL strings, and environment variables are never leaked to clients.

---

## 5. Safe Operational Practices

1. **Generating a Strong `JWT_SECRET`**:
   Generate a 256-bit (64-character hex) secret using OpenSSL or Node.js:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Protecting `.env` Files**:
   - Never commit `.env` or `.env.local` to Git. Both are excluded in `.gitignore`.
   - Use `.env.example` with placeholder values for documentation.
3. **Rotating Credentials**:
   - Rotating `JWT_SECRET` in Vercel immediately invalidates all existing active JWT tokens and requires users to sign in again.
   - Administrator passwords can be updated at any time from **Settings -> Change Admin Password** (`POST /api/auth/change-password`).

