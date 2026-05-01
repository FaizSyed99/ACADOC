import Surreal from 'surrealdb.js';

/**
 * SurrealDB Singleton Client
 * Technical Plan v1.2 §8: Grounded Retrieval Layer
 */

const url = process.env.SURREALDB_URL;
const user = process.env.SURREALDB_USER;
const pass = process.env.SURREALDB_PASS;
const ns = process.env.SURREALDB_NS;
const database = process.env.SURREALDB_DB;

// Environment variables will be validated inside initDb()
// to prevent Vercel from crashing during static compilation.

// Use globalThis for better cross-environment singleton support in Next.js
const globalForSurreal = globalThis as unknown as { surreal: Surreal };

export const db = globalForSurreal.surreal || new Surreal();

if (process.env.NODE_ENV !== 'production') globalForSurreal.surreal = db;

/**
 * Initializes the connection to SurrealDB.
 * Ensures the client is authenticated and scoped to the correct namespace/database.
 */
export async function initDb(): Promise<Surreal> {
  const currentUrl = url || 'ws://localhost:8000/rpc';
  const currentUser = user || 'root';
  const currentPass = pass || 'root';
  const currentNs = ns || 'acadoc';
  const currentDb = database || 'prod';

  if (process.env.NODE_ENV === 'production' && (!url || !user || !pass || !ns || !database)) {
    console.error('❌ Missing SurrealDB environment variables in Vercel');
    throw new Error('Database configuration missing at runtime.');
  }

  try {
    await db.connect(currentUrl);
    await db.signin({ user: currentUser, pass: currentPass });
    await db.use({ namespace: currentNs, database: currentDb });
    return db;
  } catch (error) {
    console.error('SurrealDB connection error:', error);
    throw new Error('Failed to connect to the medical knowledge base (SurrealDB).');
  }
}
