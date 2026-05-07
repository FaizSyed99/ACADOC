import { query } from '@/src/lib/db';

export interface ChatSession {
  id: string;
  user_email: string;
  subject: string;
  intent: string;
  summary: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Ensures the chat_sessions table exists.
 */
export async function ensureSessionsTable() {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      intent TEXT NOT NULL,
      summary TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await query(tableQuery);
}

/**
 * Fetch all sessions for a specific user, ordered by most recent first.
 */
export async function getUserSessions(email: string): Promise<ChatSession[]> {
  try {
    await ensureSessionsTable();
    const res = await query(
      'SELECT * FROM chat_sessions WHERE user_email = $1 ORDER BY updated_at DESC',
      [email]
    );
    return res.rows;
  } catch (error) {
    console.error('DAL Get User Sessions Error:', error);
    return [];
  }
}

/**
 * Create a new chat session.
 */
export async function createSession(email: string, subject: string, intent: string, summary: string = "New Conversation"): Promise<ChatSession | null> {
  try {
    await ensureSessionsTable();
    const res = await query(
      'INSERT INTO chat_sessions (user_email, subject, intent, summary) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, subject, intent, summary]
    );
    return res.rows[0];
  } catch (error) {
    console.error('DAL Create Session Error:', error);
    return null;
  }
}
