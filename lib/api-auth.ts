import { timingSafeEqual } from "node:crypto";
import { hasAdminSession } from "@/lib/auth";

/**
 * Bearer token for read-only API access (the Coachbook app, later the watch import).
 * Set EXERCISES_API_TOKEN in Vercel. Without it, the API is closed.
 */
export function hasApiAccess(request: Request): boolean {
  const expected = process.env.EXERCISES_API_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  if (!expected || !header.startsWith("Bearer ")) return false;

  const actual = Buffer.from(header.slice("Bearer ".length));
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

/**
 * Write access for the admin pages (session cookie) and for the Coachbook app (Bearer token).
 * Same token as the read routes, so the app needs no second secret.
 */
export async function hasWriteAccess(request: Request): Promise<boolean> {
  return hasApiAccess(request) || (await hasAdminSession());
}
