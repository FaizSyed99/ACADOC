import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"

/**
 * NextAuth Configuration: Credentials Mode
 * Technical Plan v1.2 §4: Validation Layer
 * Using local Credentials for rapid POC development without external SSO setup.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  cookies: {
    sessionToken: {
      // Use the generic name if __Secure- is causing mismatches during dev/staging
      name: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https') 
        ? `__Secure-next-auth.session-token` 
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        domain: '.acadocai.com', // MUST MATCH LANDING PAGE
        secure: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https')
      }
    }
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "AcaDoc Secure Access",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@acadoc.ai" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        // Mock user for POC after SurrealDB removal
        if (credentials.email === 'admin@acadoc.ai' && credentials.password === 'adminpassword') {
          return { id: 'admin', email: 'admin@acadoc.ai', name: 'Admin', role: 'admin' };
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
        session.user.email = token.email as string;
        // Inject custom properties for Role-Based Access Control (RBAC)
        (session.user as any).role = token.role || 'student';
        (session.user as any).isVerified = token.isVerified || false;
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
