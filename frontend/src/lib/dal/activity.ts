import { query } from '@/src/lib/db';

/**
 * Record a user action for auditing and clinical compliance.
 * Updated to use PostgreSQL usage_logs table logic.
 */
export async function recordActivity(
  email: string, 
  queryText: string, 
  tokensConsumed: number = 0
) {
  try {
    await query(
      'INSERT INTO usage_logs (email, query_text, tokens_consumed) VALUES ($1, $2, $3)',
      [email, queryText, tokensConsumed]
    );
  } catch (error) {
    console.error('DAL Record Activity Error:', error);
    // Don't throw, logging failure shouldn't crash the app
  }
}

/**
 * Retrieve activity history for a specific user.
 */
export async function getUserActivity(email: string, limit: number = 50) {
  try {
    const res = await query(
      'SELECT * FROM usage_logs WHERE email = $1 ORDER BY timestamp DESC LIMIT $2',
      [email, limit]
    );
    return res.rows;
  } catch (error) {
    console.error('DAL Get User Activity Error:', error);
    return [];
  }
}
