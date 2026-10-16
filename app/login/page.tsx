import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand, SiteFooter } from "@/components/brand";
import { hasAdminSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  if (await hasAdminSession()) {
    redirect("/admin");
  }

  return (
    <div className="login">
      <header className="site-header">
        <Brand />
        <Link href="/" className="pill pill--ghost">
          Zur Startseite
        </Link>
      </header>

      <main className="login__main">
        <LoginForm />
      </main>

      <SiteFooter />
    </div>
  );
}
