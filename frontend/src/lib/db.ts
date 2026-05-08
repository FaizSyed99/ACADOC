import { Pool } from 'pg';

/**
 * PostgreSQL Connection Pool (Neon DB)
 */

const globalForPg = globalThis as unknown as { pool: Pool };

export const pool = globalForPg.pool || new Pool({
  connectionString: `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`,
});

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

/**
 * Helper to execute queries with automatic logging and error handling.
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('🐘 [DB QUERY]', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('❌ [DB ERROR]', error);
    throw error;
  }
}
