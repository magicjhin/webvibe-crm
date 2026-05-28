"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Accept only same-origin internal paths: must start with "/" and must NOT
 * start with "//" (protocol-relative) or contain a scheme. Prevents open
 * redirect via crafted `callbackUrl` even if Auth.js defaults change.
 */
function normalizeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//")) return "/dashboard";
  // disallow newlines / control chars and obvious scheme markers
  if (/[\r\n\t]/.test(raw)) return "/dashboard";
  // never bounce back to the login page itself
  if (/^\/login(\/.*)?$/.test(raw)) return "/dashboard";
  return raw;
}

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const emailRaw = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = normalizeCallbackUrl(formData.get("callbackUrl"));

  if (typeof emailRaw !== "string" || typeof password !== "string") {
    return { ok: false, error: "Неверный запрос" };
  }

  const email = emailRaw.trim().toLowerCase();

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    // signIn redirects on success — code below is only reached on caught errors
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Неверный email или пароль" };
    }
    // NEXT_REDIRECT and other framework signals — let them bubble up.
    throw e;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
