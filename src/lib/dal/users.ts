import { db, initDb } from '../db';
import { CreateUserInput, User, userSchema } from '../models/user';

/**
 * Find a user by their record ID (e.g., 'user:123').
 * @param {string} id - The SurrealDB record ID.
 * @returns {Promise<User | null>} The validated user object or null.
 * @throws {Error} If retrieval or validation fails.
 */
export async function findById(id: string): Promise<User | null> {
  await initDb();
  try {
    const [user] = await db.select<User>(id);
    return user ? userSchema.parse(user) : null;
  } catch (error) {
    console.error(`DAL findById Error:`, error);
    throw new Error(`Failed to retrieve user: ${id}`);
  }
}

/**
 * Find a user by their email address.
 * @param {string} email - User email.
 * @returns {Promise<User | null>} The validated user object or null.
 */
export async function findByEmail(email: string): Promise<User | null> {
  await initDb();
  try {
    const [result] = await db.query<User[][]>('SELECT * FROM user WHERE email = $email LIMIT 1', { email });
    const user = result[0]?.[0];
    return user ? userSchema.parse(user) : null;
  } catch (error) {
    console.error(`DAL findByEmail Error:`, error);
    return null;
  }
}

/**
 * Create a new user record.
 * @param {CreateUserInput} input - Zod-validated user input.
 * @returns {Promise<User>} The created user record.
 */
export async function create(input: CreateUserInput): Promise<User> {
  await initDb();
  try {
    const [created] = await db.create<User>('user', {
      ...input,
      createdAt: new Date(),
    });
    return userSchema.parse(created);
  } catch (error) {
    console.error(`DAL Create User Error:`, error);
    throw new Error('Failed to create user account.');
  }
}

/**
 * Update an existing user record.
 * @param {string} id - Record ID.
 * @param {Partial<CreateUserInput>} input - Fields to update.
 */
export async function update(id: string, input: Partial<CreateUserInput>): Promise<User> {
  await initDb();
  try {
    const [updated] = await db.merge<User>(id, input);
    return userSchema.parse(updated);
  } catch (error) {
    console.error(`DAL Update User Error:`, error);
    throw new Error('Failed to update user account.');
  }
}

/**
 * List all users with filtering and pagination for the Admin Dashboard.
 * @returns {Promise<User[]>} Array of user records.
 */
export async function list({ 
  page = 1, 
  limit = 10, 
  search = '', 
  role 
}: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  role?: string; 
}) {
  await initDb();
  const start = (page - 1) * limit;
  let q = 'SELECT * FROM user';
  const filters: string[] = [];
  const params: any = { limit, start };

  if (search) {
    filters.push('(name ~ $search OR email ~ $search)');
    params.search = search;
  }
  if (role) {
    filters.push('role = $role');
    params.role = role;
  }
  
  if (filters.length > 0) q += ` WHERE ${filters.join(' AND ')}`;
  q += ' ORDER BY createdAt DESC LIMIT $limit START $start';

  try {
    const results = await db.query<User[][]>(q, params);
    const users = results[0] || [];
    return users.map(u => userSchema.parse(u));
  } catch (error) {
    console.error(`DAL List Users Error:`, error);
    throw new Error('Failed to list users.');
  }
}
