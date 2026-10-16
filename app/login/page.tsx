import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand, SiteFooter } from "@/components/brand";
import { hasAdminSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await hasAdminSession()) {
    redirect("/admin");
  }
  const { error } = await searchParams;

  return (
    <div className="login">
      <header className="site-header">
        <Brand />
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page load on purpose */}
        <a href="/" className="pill pill--ghost">
          Zur Startseite
        </a>
      </header>

      <main className="login__main">
        <LoginForm error={error} />
      </main>

      <SiteFooter />
    </div>
  );
}
