import Image from "next/image";
import Link from "next/link";

export function BrandMark() {
  return (
    <span className="brand__mark">
      <Image src="/icon-192.png" alt="" width={192} height={192} aria-hidden="true" />
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
      <span>© 2026 Coachbook · v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
      <nav aria-label="Rechtliches">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/kontakt">Kontakt</Link>
      </nav>
    </footer>
  );
}
