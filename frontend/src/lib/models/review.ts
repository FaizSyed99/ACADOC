import { z } from 'zod';

export const ModerationStatus = z.enum(['pending', 'approved', 'rejected']);
export type ModerationStatus = z.infer<typeof ModerationStatus>;

export const reviewSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  content: z.string().min(10),
  sourceReference: z.string(),
  status: ModerationStatus.default('pending'),
  moderatedBy: z.string().optional(),
  moderatedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type Review = z.infer<typeof reviewSchema>;
