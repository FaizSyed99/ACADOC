import { z } from 'zod';

export const ActivityAction = z.enum(['login', 'search', 'answer_view', 'review_submission']);
export type ActivityAction = z.infer<typeof ActivityAction>;

export const activitySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  action: ActivityAction,
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.date().default(() => new Date()),
  ip: z.string().optional(),
});

export type ActivityLog = z.infer<typeof activitySchema>;
