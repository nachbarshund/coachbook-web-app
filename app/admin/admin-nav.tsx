"use client";

import { usePathname } from "next/navigation";

const items = [{ href: "/admin", label: "Übungen" }];

// Plain links: each click is a full page load, so no stale client router state.
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin__nav" aria-label="Admin">
      {items.map((item) => (
        <a key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
