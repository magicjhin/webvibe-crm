import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible NextAuth config — no DB / no Prisma / no bcrypt.
 * Used by middleware (which runs on Edge runtime).
 *
 * The full config (in lib/auth.ts) extends this with the Credentials provider.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [], // populated in lib/auth.ts
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
