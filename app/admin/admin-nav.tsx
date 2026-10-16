"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Übungen" },
  { href: "/admin/upload", label: "Hochladen" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin__nav" aria-label="Admin">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
