import { query } from '@/src/lib/db';
import { CreateUserInput, User, userSchema } from '../models/user';

/**
 * Find a user by their record ID (UUID).
 */
export async function findById(id: string): Promise<User | null> {
  try {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    const user = res.rows[0];
    if (!user) return null;
    
    return userSchema.parse({
      ...user,
      createdAt: new Date(user.created_at)
    });
  } catch (error) {
    console.error(`DAL findById Error:`, error);
    throw new Error(`Failed to retrieve user: ${id}`);
  }
}

/**
 * Find a user by their email address.
 */
export async function findByEmail(email: string): Promise<User | null> {
  try {
    const res = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = res.rows[0];
    if (!user) return null;
    
    return userSchema.parse({
      ...user,
      createdAt: new Date(user.created_at)
    });
  } catch (error) {
    console.error(`DAL findByEmail Error:`, error);
    return null;
  }
}

/**
 * Create a new user record.
 */
export async function create(input: CreateUserInput): Promise<User> {
  try {
    const res = await query(
      'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *',
      [input.email, input.name, input.role]
    );
    const created = res.rows[0];
    return userSchema.parse({
      ...created,
      createdAt: new Date(created.created_at)
    });
  } catch (error) {
    console.error(`DAL Create User Error:`, error);
    throw new Error('Failed to create user account.');
  }
}

/**
 * Update an existing user record.
 */
export async function update(id: string, input: Partial<CreateUserInput>): Promise<User> {
  try {
    const fields = Object.keys(input);
    const values = Object.values(input);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    
    const res = await query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    const updated = res.rows[0];
    return userSchema.parse({
      ...updated,
      createdAt: new Date(updated.created_at)
    });
  } catch (error) {
    console.error(`DAL Update User Error:`, error);
    throw new Error('Failed to update user account.');
  }
}
