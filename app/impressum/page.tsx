import type { Metadata } from "next";
import Link from "next/link";
import { Brand, SiteFooter } from "@/components/brand";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function LegalPage() {
  return (
    <div className="home">
      <header className="site-header">
        <Brand />
        <Link href="/" className="pill pill--ghost">
          Zur Startseite
        </Link>
      </header>
      <main className="home__main" style={{ alignItems: "flex-start" }}>
        <h1 className="admin__title" style={{ margin: 0 }}>Impressum</h1>
        <p className="home__lede" style={{ textAlign: "left", margin: "24px 0 0" }}>
          Platzhalter. Die Angaben werden vor dem Launch ergänzt.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
