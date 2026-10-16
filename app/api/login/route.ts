import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, verifyAdminPassword } from "@/lib/auth";

// Plain form POST: sets the session cookie and answers with a redirect.
// No client router involved, so the browser always does a full page load.
export async function POST(request: Request) {
  const form = await request.formData();
  const password = form.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.redirect(new URL("/login?error=empty", request.url), 303);
  }
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/login?error=config", request.url), 303);
  }
  if (!verifyAdminPassword(password)) {
    return NextResponse.redirect(new URL("/login?error=wrong", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
