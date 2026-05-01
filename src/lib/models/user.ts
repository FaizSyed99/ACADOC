import { z } from 'zod';

export const UserRole = z.enum(['student', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6).optional(),
  role: UserRole.default('student'),
  isVerified: z.boolean().default(false),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userSchema = createUserSchema.extend({
  id: z.string(),
  createdAt: z.date().default(() => new Date()),
});

export type User = z.infer<typeof userSchema>;
