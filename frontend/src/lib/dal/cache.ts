import { query } from '@/src/lib/db';
import crypto from 'crypto';

export interface CachedPrompt {
  query_hash: string;
  subject: string;
  intent: string;
  query: string;
  frequency: number;
  answer?: string;
  citations?: any;
  confidence?: number;
  reason?: string;
}

function getQueryHash(subject: string, intent: string, rawQuery: string) {
  const normalizedQuery = rawQuery.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(`${subject}:${intent}:${normalizedQuery}`).digest('hex');
}

/**
 * Ensures the global_prompts_cache table exists.
 */
export async function ensureCacheTable() {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS global_prompts_cache (
      query_hash TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      intent TEXT NOT NULL,
      query TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      answer TEXT,
      citations JSONB,
      confidence NUMERIC,
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await query(tableQuery);
}

/**
 * Check if a prompt exists in the cache. 
 * If it has been asked >= 5 times and has an answer, return it immediately.
 * Otherwise, log/increment the prompt frequency and return null.
 */
export async function checkGlobalCache(subject: string, intent: string, rawQuery: string) {
  try {
    await ensureCacheTable();
    const hash = getQueryHash(subject, intent, rawQuery);

    const res = await query(
      'SELECT * FROM global_prompts_cache WHERE query_hash = $1',
      [hash]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      
      // Increment frequency
      await query(
        'UPDATE global_prompts_cache SET frequency = frequency + 1, updated_at = NOW() WHERE query_hash = $1',
        [hash]
      );

      // Return cached answer if frequency is high enough and answer exists
      if (row.frequency >= 5 && row.answer) {
        return {
          answer: row.answer,
          citations: row.citations,
          confidence: row.confidence ? parseFloat(row.confidence) : undefined,
          validation_reason: row.reason,
          is_sufficient: true, // Assuming cached answers are sufficient
          from_cache: true
        };
      }
    } else {
      // First time this exact query is asked
      await query(
        `INSERT INTO global_prompts_cache (query_hash, subject, intent, query) 
         VALUES ($1, $2, $3, $4)`,
        [hash, subject, intent, rawQuery]
      );
    }

    return null;
  } catch (error) {
    console.error('DAL Global Cache Check Error:', error);
    return null;
  }
}

/**
 * Update the cache with the response from the backend.
 */
export async function updateGlobalCache(subject: string, intent: string, rawQuery: string, data: any) {
  try {
    // Only cache successful/sufficient answers
    if (!data.answer || data.is_sufficient === false) return;

    const hash = getQueryHash(subject, intent, rawQuery);
    
    await query(
      `UPDATE global_prompts_cache 
       SET answer = $1, citations = $2, confidence = $3, reason = $4, updated_at = NOW() 
       WHERE query_hash = $5`,
      [
        data.answer,
        data.citations ? JSON.stringify(data.citations) : null,
        data.confidence ?? null,
        data.validation_reason ?? null,
        hash
      ]
    );
  } catch (error) {
    console.error('DAL Global Cache Update Error:', error);
  }
}
