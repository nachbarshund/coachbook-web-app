import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "cb_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Single-admin auth for the first version.
 *
 * Required env var (set in Vercel and in .env.local, never committed):
 * - ADMIN_PASSWORD: the admin password. It also signs the session cookie,
 *   so changing it logs out all sessions.
 */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && password === expected;
}

function sign(payload: string): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD is not set");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  return `${expiresAt}.${sign(`admin:${expiresAt}`)}`;
}

export function isValidSessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!signature || !Number.isInteger(expiresAt) || expiresAt * 1000 < now) return false;

  const expected = Buffer.from(sign(`admin:${expiresAt}`));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hasAdminSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function setAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
