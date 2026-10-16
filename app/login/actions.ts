"use server";

import { revalidatePath } from "next/cache";
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
  // Drop cached client routes (e.g. a pre-login /admin redirect) so the next page is fresh.
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await clearAdminSession();
  revalidatePath("/", "layout");
  redirect("/");
}
