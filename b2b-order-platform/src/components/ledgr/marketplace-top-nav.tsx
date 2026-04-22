"use client";
import * as React from "react";
import Link from "next/link";
import { ShoppingCart, Search } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { cn } from "@/lib/utils";

export interface MarketplaceTopNavProps {
  active?: "how" | "sell" | "profile";
  user?: { name: string; avatar?: string | null };
  cartCount?: number;
}

const navLinks = [
  { id: "how", label: "How it works", href: "/#how" },
  { id: "sell", label: "Sell on Ledgr", href: "/dashboard" },
];

export function MarketplaceTopNav({ active, user, cartCount = 0 }: MarketplaceTopNavProps) {
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  // ⌘K / Ctrl+K / "/" focuses the search — the kbd hint isn't just decorative.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      const isSlash = e.key === "/" && !isMod;
      const isK = isMod && e.key.toLowerCase() === "k";
      if (!isK && !isSlash) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      // Don't hijack while the user is typing in another input/textarea
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="h-14 flex items-center gap-5 px-6 border-b border-line-2 bg-paper">
      <BrandLockup size="md" />
      <nav className="flex gap-[2px]" aria-label="Primary">
        {navLinks.map((l) => (
          <Link
            key={l.id}
            href={l.href}
            className={cn(
              "px-[10px] py-[6px] text-[13px] rounded-[4px] transition-colors hover:bg-paper-2",
              active === l.id ? "text-ink font-medium" : "text-ink-2"
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <label className="flex-1 max-w-[360px] h-8 flex items-center gap-2 px-3 border border-line rounded-[4px] bg-paper-2 text-ink-4 text-[12.5px] focus-within:border-ink-3 transition-colors">
        <Search className="h-[14px] w-[14px] shrink-0" aria-hidden />
        <input
          ref={searchRef}
          placeholder="Search stores, products, categories…"
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-4"
          aria-label="Search"
        />
        <span className="font-mono text-[10px] text-ink-4 border border-line rounded-[3px] px-[5px] py-[1px] leading-none shrink-0">⌘K</span>
      </label>
      <div className="ml-auto flex items-center gap-[6px]">
        {user ? (
          <Link
            href="/profile"
            className={cn(
              "inline-flex items-center gap-2 px-[10px] py-[4px] rounded-full border border-line bg-paper text-[13px]",
              active === "profile" && "ring-2 ring-ink/10"
            )}
          >
            <span className="w-6 h-6 rounded-full bg-ink text-paper grid place-items-center font-display font-semibold text-[10.5px] tracking-[-.02em]">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <span className="pr-1">{user.name.split(" ")[0]}</span>
          </Link>
        ) : (
          <Link href="/dashboard/login" className="px-[10px] py-[6px] text-[13px] text-ink-2 hover:text-ink">
            Seller sign in
          </Link>
        )}
        <Link
          href="/cart"
          aria-label="Cart"
          className="inline-flex items-center gap-[6px] px-[10px] py-[6px] text-[13px] text-ink-2 hover:text-ink"
        >
          <ShoppingCart className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="font-mono text-[10.5px] bg-ink text-paper px-[6px] py-[1px] rounded-full">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
