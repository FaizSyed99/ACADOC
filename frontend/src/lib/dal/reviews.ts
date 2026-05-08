import { query } from '@/src/lib/db';

/**
 * Submit a new textbook content review for moderation.
 */
export async function submitReview(input: any) {
  try {
    const res = await query(
      'INSERT INTO reviews (user_id, content_id, rating, comment, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [input.userId, input.contentId, input.rating, input.comment, 'pending']
    );
    return res.rows[0];
  } catch (error) {
    console.error('DAL Submit Review Error:', error);
    throw new Error('Failed to submit review.');
  }
}

/**
 * Retrieve reviews awaiting admin moderation.
 */
export async function getPendingReviews() {
  try {
    const res = await query('SELECT * FROM reviews WHERE status = $1 ORDER BY created_at ASC', ['pending']);
    return res.rows;
  } catch (error) {
    console.error('DAL Get Pending Reviews Error:', error);
    throw new Error('Failed to retrieve review queue.');
  }
}

/**
 * Update the moderation status of a user review.
 */
export async function moderateReview(id: string, status: string, adminId: string) {
  try {
    const res = await query(
      'UPDATE reviews SET status = $2, moderated_by = $3, moderated_at = NOW() WHERE id = $1 RETURNING *',
      [id, status, adminId]
    );
    return res.rows[0];
  } catch (error) {
    console.error('DAL Moderate Review Error:', error);
    throw new Error('Failed to moderate review.');
  }
}
