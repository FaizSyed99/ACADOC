import { auth } from "./auth"
import { Session } from "next-auth"

/**
 * Authentication Helpers
 * Technical Plan v1.2 §4: Validation Layer
 */

/**
 * Ensures the user is signed in.
 * @returns {Promise<Session>} The active session.
 * @throws {Error} Throws "UNAUTHORIZED" if no session exists.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }
  
  return session;
}

/**
 * Ensures the session user has 'admin' privileges.
 * @param {Session} session - The session context obtained from requireAuth().
 * @throws {Error} Throws "FORBIDDEN" if the user is not an admin.
 */
export function requireAdmin(session: Session) {
  const role = (session.user as any)?.role;
  
  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }
}
