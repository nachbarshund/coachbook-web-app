import type { Metadata } from "next";
import { Brand, SiteFooter } from "@/components/brand";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function LegalPage() {
  return (
    <div className="home">
      <header className="site-header">
        <Brand />
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page load on purpose */}
        <a href="/" className="pill pill--ghost">
          Zur Startseite
        </a>
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
