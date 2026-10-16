import Image from "next/image";

export function BrandMark() {
  return (
    <span className="brand__mark">
      <Image src="/icon-192.png" alt="" width={192} height={192} aria-hidden="true" />
    </span>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <a href={href} className="brand">
      <BrandMark />
      <span>Coachbook</span>
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>
        © 2026 Coachbook <span className="site-footer__version">· v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
      </span>
      <nav aria-label="Rechtliches">
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="/kontakt">Kontakt</a>
      </nav>
    </footer>
  );
}
