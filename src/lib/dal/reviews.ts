import { db, initDb } from '../db';
import { Review, ModerationStatus, reviewSchema } from '../models/review';

/**
 * Submit a new textbook content review for moderation.
 */
export async function submitReview(input: Omit<Review, 'id' | 'status' | 'createdAt'>): Promise<Review> {
  await initDb();
  try {
    const [created] = await db.create<Review>('review', {
      ...input,
      status: 'pending',
      createdAt: new Date(),
    });
    return reviewSchema.parse(created);
  } catch (error) {
    console.error('DAL Submit Review Error:', error);
    throw new Error('Failed to submit review.');
  }
}

/**
 * Retrieve reviews awaiting admin moderation.
 */
export async function getPendingReviews(): Promise<Review[]> {
  await initDb();
  try {
    const [results] = await db.query<Review[][]>('SELECT * FROM review WHERE status = "pending" ORDER BY createdAt ASC');
    return (results || []).map(r => reviewSchema.parse(r));
  } catch (error) {
    console.error('DAL Get Pending Reviews Error:', error);
    throw new Error('Failed to retrieve review queue.');
  }
}

/**
 * Update the moderation status of a user review.
 */
export async function moderateReview(id: string, status: ModerationStatus, adminId: string) {
  await initDb();
  try {
    const [updated] = await db.merge<Review>(id, {
      status,
      moderatedBy: adminId, // Note: Schema might need update if we track moderator
      moderatedAt: new Date(),
    });
    return reviewSchema.parse(updated);
  } catch (error) {
    console.error('DAL Moderate Review Error:', error);
    throw new Error('Failed to moderate review.');
  }
}
