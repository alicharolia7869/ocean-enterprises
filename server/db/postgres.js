const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');

// Keep PostgreSQL DATE columns (OID 1082) as 'YYYY-MM-DD' strings so date slicing works consistently
types.setTypeParser(1082, (val) => val);

let pool = null;

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

function isPostgresConfigured() {
  const dbUrl = getConnectionString();
  return Boolean(dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')));
}

function getPool() {
  if (pool) return pool;

  const connectionString = getConnectionString();
  if (!connectionString) {
    return null;
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: parseInt(process.env.PG_MAX_CONNECTIONS || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client pool:', err);
  });

  return pool;
}

/**
 * Normalize row values so Date objects from TIMESTAMPTZ columns serialize as ISO strings
 * matching the local JSON store format.
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

/**
 * Translates SQLite style "?" placeholders to PostgreSQL "$1, $2, $3"
 * and translates dialect-specific functions like date('now'), MAX(0, ...), and strftime.
 */
function normalizeQuery(sql) {
  let paramIndex = 0;
  let normalized = sql
    // Replace INSERT OR REPLACE INTO business_settings
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO\s+business_settings\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, cols, vals) => {
      return `INSERT INTO business_settings (${cols}) VALUES (${vals}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    })
    // Translate SQLite scalar MAX(0, expr) to PostgreSQL GREATEST(0, expr)
    .replace(/\bMAX\s*\(\s*0\s*,/gi, 'GREATEST(0,')
    // Case-insensitive LIKE in PostgreSQL
    .replace(/\bLIKE\b/gi, 'ILIKE')
    // Replace ? with $1, $2, etc.
    .replace(/\?/g, () => `$${++paramIndex}`)
    // Date/time dialect adaptation
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/date\(now\(\)\)/gi, 'CURRENT_DATE')
    .replace(/strftime\('%Y-%m',\s*'now'\)/gi, "TO_CHAR(CURRENT_DATE, 'YYYY-MM')")
    .replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY-MM')");

  // If INSERT statement does not have RETURNING, append appropriate returning column
  if (/^\s*INSERT\s+INTO\s+/i.test(normalized) && !/RETURNING/i.test(normalized)) {
    if (/INSERT\s+INTO\s+business_settings/i.test(normalized)) {
      normalized += ' RETURNING key';
    } else {
      normalized += ' RETURNING id';
    }
  }

  return normalized;
}

async function query(sql, params = []) {
  const p = getPool();
  if (!p) throw new Error('PostgreSQL is not configured. DATABASE_URL is required.');
  const normalizedSql = normalizeQuery(sql);
  const result = await p.query(normalizedSql, params);
  return result;
}

async function getOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] ? normalizeRow(result.rows[0]) : null;
}

async function getAll(sql, params = []) {
  const result = await query(sql, params);
  return (result.rows || []).map(normalizeRow);
}

async function run(sql, params = []) {
  const result = await query(sql, params);
  const lastInsertRowid = result.rows && result.rows[0] && (result.rows[0].id || result.rows[0].key) ? (result.rows[0].id || result.rows[0].key) : null;
  return {
    lastInsertRowid,
    changes: result.rowCount || 0
  };
}

async function transaction(callback) {
  const p = getPool();
  if (!p) throw new Error('PostgreSQL is not configured. DATABASE_URL is required.');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  const p = getPool();
  if (!p) return false;

  const schemaPath = path.join(__dirname, 'schema.postgres.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  await p.query(sql);
  console.log('✅ PostgreSQL schema migrations verified successfully.');
  return true;
}

async function testConnection() {
  const p = getPool();
  if (!p) return { ok: false, error: 'DATABASE_URL is not set' };
  try {
    const res = await p.query('SELECT NOW() as current_time, current_database() as db_name, version()');
    return {
      ok: true,
      time: res.rows[0].current_time,
      database: res.rows[0].db_name,
      version: res.rows[0].version
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  isPostgresConfigured,
  getPool,
  query,
  getOne,
  getAll,
  run,
  transaction,
  runMigrations,
  testConnection,
  normalizeQuery
};
