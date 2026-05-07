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

/**
 * Ensures the chat_messages table exists.
 */
export async function ensureMessagesTable() {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations JSONB,
      is_sufficient BOOLEAN,
      confidence NUMERIC,
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await query(tableQuery);
}

/**
 * Save a message to a session.
 */
export async function saveMessage(sessionId: string, message: any) {
  try {
    await ensureMessagesTable();
    await query(
      `INSERT INTO chat_messages (session_id, role, content, citations, is_sufficient, confidence, reason) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sessionId, 
        message.role, 
        message.content, 
        message.citations ? JSON.stringify(message.citations) : null,
        message.isSufficient ?? null,
        message.confidence ?? null,
        message.reason ?? null
      ]
    );
    
    // Update session's updated_at
    await query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [sessionId]);
  } catch (error) {
    console.error('DAL Save Message Error:', error);
  }
}

/**
 * Fetch all messages for a session.
 */
export async function getSessionMessages(sessionId: string) {
  try {
    await ensureMessagesTable();
    const res = await query(
      'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    
    return res.rows.map(row => ({
      role: row.role,
      content: row.content,
      citations: row.citations,
      isSufficient: row.is_sufficient,
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      reason: row.reason
    }));
  } catch (error) {
    console.error('DAL Get Session Messages Error:', error);
    return [];
  }
}
