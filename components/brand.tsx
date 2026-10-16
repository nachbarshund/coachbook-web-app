import Link from "next/link";

export function BrandMark() {
  return (
    <span className="brand__mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="4" fill="#f6f7f4" />
        <circle cx="9" cy="9" r="8" fill="none" stroke="#5be08f" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand">
      <BrandMark />
      <span>Coachbook</span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© 2026 Coachbook</span>
      <nav aria-label="Rechtliches">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/kontakt">Kontakt</Link>
      </nav>
    </footer>
  );
}
