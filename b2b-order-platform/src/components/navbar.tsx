"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { RoleBadge } from "./role-badge";

export function Navbar({ role }: { role: UserRole | null }) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!role) return null;

  const buyerLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/orders", label: "Orders" },
    { href: "/invoices", label: "Invoices" },
  ];

  const sellerLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/orders", label: "Orders" },
    { href: "/invoices", label: "Invoices" },
  ];

  const links = role === "buyer" ? buyerLinks : sellerLinks;

  return (
    <nav className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className={`h-2 w-2 rounded-full ${role === "buyer" ? "bg-accent-buyer" : "bg-accent-seller"}`} />
            <span className="font-mono text-sm font-medium tracking-tight text-ink">
              B2B<span className="text-ink-faint">/</span>orders
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? role === "buyer"
                        ? "text-accent-buyer bg-accent-buyer/10"
                        : "text-accent-seller bg-accent-seller/10"
                      : "text-ink-muted hover:text-ink hover:bg-surface-hover"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <RoleBadge role={role} />
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-ink-faint hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
