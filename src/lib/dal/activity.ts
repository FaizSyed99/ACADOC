import { db, initDb } from '../db';
import { ActivityAction, ActivityLog, activitySchema } from '../models/activity';

/**
 * Record a user action for auditing and clinical compliance.
 * Technical Plan §9: Mandatory for near-zero hallucination audit trails.
 */
export async function recordActivity(
  userId: string, 
  action: ActivityAction, 
  metadata: Record<string, any> = {},
  ip?: string
): Promise<ActivityLog> {
  await initDb();
  try {
    const [log] = await db.create<ActivityLog>('activity_log', {
      userId,
      action,
      metadata,
      ip,
      timestamp: new Date(),
    });
    return activitySchema.parse(log);
  } catch (error) {
    console.error('DAL Record Activity Error:', error);
    throw new Error('Failed to log user activity.');
  }
}

/**
 * Retrieve activity history for a specific user.
 */
export async function getUserActivity(
  userId: string, 
  { limit = 50, startDate }: { limit?: number; startDate?: Date } = {}
): Promise<ActivityLog[]> {
  await initDb();
  let q = 'SELECT * FROM activity_log WHERE userId = $userId';
  const params: any = { userId, limit };

  if (startDate) {
    q += ' AND timestamp >= $startDate';
    params.startDate = startDate;
  }

  q += ' ORDER BY timestamp DESC LIMIT $limit';

  try {
    const [results] = await db.query<ActivityLog[][]>(q, params);
    return (results || []).map(l => activitySchema.parse(l));
  } catch (error) {
    console.error('DAL Get User Activity Error:', error);
    throw new Error('Failed to retrieve activity history.');
  }
}
