import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { SurrealDBAdapter } from "@auth/surrealdb-adapter"
import { db, initDb } from "./db"
import { findByEmail } from "./dal/users"
import bcrypt from "bcryptjs"

/**
 * NextAuth Configuration: Credentials Mode
 * Technical Plan v1.2 §4: Validation Layer
 * Using local Credentials for rapid POC development without external SSO setup.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SurrealDBAdapter(initDb() as any),
  providers: [
    Credentials({
      name: "AcaDoc Secure Access",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@acadoc.ai" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await findByEmail(credentials.email as string);
        
        // Security: Securely validate password hash
        if (user && (user as any).password) {
          // Fallback for legacy admin plaintext password to prevent lockout during dev
          if ((user as any).password === 'adminpassword' && credentials.password === 'adminpassword') {
             return user;
          }
          
          const isValid = bcrypt.compareSync(credentials.password as string, (user as any).password);
          if (isValid) return user;
        }
        
        return null;
      }
    }),
  ],
  callbacks: {
    /**
     * JWT Callback
     * Persists role and verification status from SurrealDB into the encrypted token.
     */
    async jwt({ token, user }) {
      if (user) {
        // User data is provided by the adapter on the first sign-in
        token.role = (user as any).role || 'student';
        token.isVerified = (user as any).isVerified || false;
      }
      return token;
    },
    /**
     * Session Callback
     * Exposes user ID and role to the frontend components.
     */
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // Inject custom properties for Role-Based Access Control (RBAC)
        (session.user as any).role = token.role;
        (session.user as any).isVerified = token.isVerified;
      }
      return session;
    },
  },
  pages: {
    // Custom sign-in page to maintain AcaDoc AI branding
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  // Audit-level logging in development mode
  debug: process.env.NODE_ENV === "development",
})
