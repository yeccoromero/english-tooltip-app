"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Panel" },
  { href: "/review", label: "Repasar" },
  { href: "/library", label: "Biblioteca" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <Link href="/" className="brand">English Tooltip</Link>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "on" : undefined}>{l.label}</Link>
      ))}
      <form action="/auth/signout" method="post">
        <button type="submit">Salir</button>
      </form>
    </nav>
  );
}
