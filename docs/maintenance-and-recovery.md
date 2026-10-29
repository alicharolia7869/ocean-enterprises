# Maintenance & Recovery Guide

This guide outlines operational maintenance, database backup and recovery procedures, sequence synchronization, and ledger auditing for the **Ocean Enterprises Business Management System**.

---

## 1. Routine Operational Maintenance

### 1.1 Exporting Periodic CSV Accounting Backups
Operators and accountants can export human-readable CSV backups directly from the web UI without needing database CLI access:
1. **Orders Backup**: Navigate to **All Orders**, set filters to **All Time** / **All Customers**, and click **Export CSV**.
2. **Sales Time-Series Backup**: Navigate to **Reports -> Sales Report**, select **Daily**, **Weekly**, or **Monthly**, and click **Export CSV**.
3. **Customer Receivables Ledger Backup**: Navigate to **Reports -> Customer-wise Report** and click **Export CSV**.
4. **Product & Inventory Valuation Backup**: Navigate to **Reports -> Product-wise Report** and click **Export CSV**.

---

## 2. PostgreSQL Database Backup & Restore

### 2.1 Logical Backups via `pg_dump`
When using Neon PostgreSQL (or any standard PostgreSQL instance), create a full schema + data snapshot using `pg_dump`:

```bash
# Export full backup (schema + data) to a timestamped SQL file
pg_dump "$DATABASE_URL" --no-owner --no-privileges -f ocean_backup_$(date +%Y%m%d).sql
```

### 2.2 Restoring from a `pg_dump` Snapshot
```bash
psql "$DATABASE_URL" -f ocean_backup_YYYYMMDD.sql
```

### 2.3 Neon Point-in-Time Restore (PITR)
Because production runs on **Neon PostgreSQL**, you can also use the **Neon Console -> Branches / Restore** feature to restore the `neondb` database to any historical timestamp within your Neon plan's retention window without downtime.

---

## 3. Idempotent Schema Migration & Sequence Synchronization (`npm run db:migrate`)

[`server/db/migrate.js`](../server/db/migrate.js) is designed to be **100% non-destructive and idempotent**:

1. Runs [`server/db/schema.postgres.sql`](../server/db/schema.postgres.sql), which uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `ALTER TABLE water_entries ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0`.
2. Inserts initial records from [`server/data/ocean_store.json`](../server/data/ocean_store.json) using `ON CONFLICT (id) DO NOTHING` (or `ON CONFLICT (key) DO NOTHING` for `business_settings`), ensuring existing production records are **never overwritten or deleted**.
3. Automatically synchronizes PostgreSQL `SERIAL` primary-key sequences for all 8 integer-keyed tables (`users`, `customers`, `products`, `orders`, `order_items`, `water_entries`, `payments`, `deliveries`) using:
   ```sql
   SELECT setval(
     pg_get_serial_sequence('<table>', 'id'),
     COALESCE((SELECT MAX(id) FROM <table>), 0) + 1,
     false
   );
   ```
   If you ever manually import rows with explicit `id` values into PostgreSQL, running `npm run db:migrate` will safely realign all auto-increment sequences so subsequent `INSERT` statements never fail with duplicate primary key errors.

---

## 4. Local JSON Store Maintenance (`server/data/ocean_store.json`)

When running locally without PostgreSQL:
- **Location**: [`server/data/ocean_store.json`](../server/data/ocean_store.json).
- **Backup**: Copy `server/data/ocean_store.json` to a backup file before running destructive experiments.
- **Factory Reset (Local Only)**: Run `npm run seed` (`node server/db/seed.js`) to regenerate the default demo dataset. *(Note: Never run `npm run seed` against a live production database with real customer records if you intend to preserve existing transactions; use `npm run db:migrate` instead.)*

