import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

/**
 * Edge-compatible middleware. Uses the lightweight authConfig (no DB / no bcrypt),
 * which means the JWT session is verified, but we don't hit Prisma here.
 */
const { auth } = NextAuth(authConfig);

// Public paths — explicit whitelist. Everything else is protected.
const PUBLIC: RegExp[] = [
  /^\/login(\/.*)?$/,
  /^\/sign\/.+/, // public signature page (GET)
  /^\/api\/sign\/.+/, // POST sign — protected by its own token check
  /^\/api\/auth\/.+/, // NextAuth route handlers
  /^\/api\/cron\/.+/, // protected by CRON_SECRET bearer
  /^\/offline$/, // PWA offline shell
  /^\/manifest\.webmanifest$/,
  /^\/icons?\/.+/,
  /^\/favicon\.ico$/,
];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC.some((re) => re.test(pathname))) {
    // If already authed, bounce away from /login back to dashboard.
    if (req.auth && /^\/login(\/.*)?$/.test(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return;
  }

  if (!req.auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
});

export const config = {
  // Skip Next.js internals and any path with a file extension (static assets).
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
