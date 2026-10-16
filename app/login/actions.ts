"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, setAdminSession, verifyAdminPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Bitte Passwort eingeben." };
  }

  if (!process.env.ADMIN_PASSWORD) {
    return { error: "Der Zugang ist noch nicht konfiguriert." };
  }

  if (!verifyAdminPassword(password)) {
    return { error: "Passwort falsch. Bitte erneut versuchen." };
  }

  await setAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await clearAdminSession();
  redirect("/");
}
