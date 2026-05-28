import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { signInSchema } from "@/lib/validators/auth";

/**
 * Full NextAuth config — Node runtime only (uses Prisma + bcrypt).
 * Middleware imports the lighter edge-safe config from lib/auth.config.ts.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;

        // Single-user invariant (ADR-002): scan the entire User table, not by
        // email. If it's not exactly one row, refuse auth — defends against
        // manual DB edits, bad migrations, or future code paths that could
        // create a second admin behind the seed-side guard.
        const users = await prisma.user.findMany({ take: 2 });
        if (users.length !== 1) return null;
        const user = users[0]!;

        // The single user's email must match what was submitted (normalized).
        if (user.email !== parsed.data.email.trim().toLowerCase()) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});
