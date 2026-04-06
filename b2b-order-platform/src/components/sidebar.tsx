"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { LayoutDashboard, ShoppingBag, FileText, LogOut, Store, ShoppingCart, Package } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function Sidebar({ role, name }: { role: UserRole | null; name: string }) {
  const pathname = usePathname();

  if (!role) return null;

  const isBuyer = role === "buyer";

  const navItems: NavItem[] = isBuyer
    ? [
        { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { href: "/marketplace", label: "Marketplace", icon: <Store size={20} /> },
        { href: "/cart", label: "Cart", icon: <ShoppingCart size={20} /> },
        { href: "/orders", label: "Orders", icon: <ShoppingBag size={20} /> },
        { href: "/invoices", label: "Invoices", icon: <FileText size={20} /> },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { href: "/catalogue", label: "Catalogue", icon: <Package size={20} /> },
        { href: "/orders", label: "Orders", icon: <ShoppingBag size={20} /> },
        { href: "/invoices", label: "Invoices", icon: <FileText size={20} /> },
      ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-surface-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <svg className="h-8 w-8" viewBox="0 0 40 40" fill="none">
            <path d="M4 36V12l10-8v32H4z" fill="#b34215" />
            <rect x="7" y="20" width="4" height="16" fill="white" />
            <path d="M18 36V8l10-4v32H18z" fill="#b34215" />
            <rect x="21" y="16" width="4" height="6" fill="white" />
            <rect x="21" y="26" width="4" height="10" fill="white" />
            <path d="M28 36V14l8 4v18H28z" fill="#b34215" />
          </svg>
          <span className="text-2xl font-extrabold tracking-tight text-[#b34215]">Ledgr</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-accent-buyer/15 text-accent-buyer"
                      : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  <span className={isActive ? "text-accent-buyer" : "text-ink-faint"}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — account */}
      <div className="border-t border-surface-border p-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white ${
              isBuyer ? "bg-accent-buyer" : "bg-accent-seller"
            }`}>
              {(name || "U").charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-ink-muted">{name || role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-ink-faint hover:text-ink"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
