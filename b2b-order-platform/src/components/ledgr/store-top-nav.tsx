import * as React from "react";
import Link from "next/link";
import { ShoppingCart, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StoreTopNavProps {
  shop: {
    slug: string;
    name: string;
    monogram: string;
    brand?: string; // optional inline override of --brand
  };
  active?: "shop" | "orders" | "recurring" | "account";
  user?: { name: string } | null;
  cartCount?: number;
}

export function StoreTopNav({ shop, active = "shop", user, cartCount = 0 }: StoreTopNavProps) {
  const base = `/store/${shop.slug}`;
  const links = [
    { id: "shop", label: "Shop", href: base },
    { id: "orders", label: "Orders", href: `${base}/orders` },
    { id: "recurring", label: "Recurring", href: `${base}/recurring` },
    { id: "account", label: "Account", href: "/profile" },
  ];
  return (
    <header
      className="h-14 flex items-center gap-5 px-6 border-b border-line-2 bg-paper relative"
      style={shop.brand ? ({ ["--brand" as any]: shop.brand } as React.CSSProperties) : undefined}
    >
      <span aria-hidden className="absolute top-0 left-0 right-0 h-[3px] bg-brand" />
      <Link href={base} className="inline-flex items-center gap-[10px]">
        <span className="w-[30px] h-[30px] rounded-[7px] bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[13px] tracking-[-.015em]">
          {shop.monogram}
        </span>
        <span className="font-display font-semibold text-[17px] tracking-[-.02em] text-ink">{shop.name}</span>
      </Link>
      <nav className="flex gap-[2px]" aria-label="Primary">
        {links.map((l) => (
          <Link
            key={l.id}
            href={l.href}
            className={cn(
              "px-[10px] py-[6px] text-[13px] rounded-[4px] relative transition-colors hover:bg-paper-2",
              active === l.id ? "text-ink font-medium" : "text-ink-2"
            )}
          >
            {l.label}
            {active === l.id && (
              <span
                aria-hidden
                className="absolute left-[10px] right-[10px] -bottom-2 h-[2px] bg-brand rounded-[2px]"
              />
            )}
          </Link>
        ))}
      </nav>
      <label className="flex-1 max-w-[320px] h-8 flex items-center gap-2 px-3 border border-line rounded-[4px] bg-paper-2 text-ink-4 text-[12.5px]">
        <Search className="h-[13px] w-[13px]" />
        <input
          placeholder="Search this shop…"
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-4"
          aria-label="Search shop"
        />
      </label>
      <div className="ml-auto flex items-center gap-[4px]">
        {user ? (
          <span className="px-[10px] py-[6px] text-[13px] text-ink-2 truncate max-w-[240px]">
            Signed in as {user.name}
          </span>
        ) : (
          <Link href="/login" className="px-[10px] py-[6px] text-[13px] text-ink-2 hover:text-ink">
            Sign in
          </Link>
        )}
        <Link
          href="/cart"
          aria-label="Cart"
          className="inline-flex items-center gap-[6px] px-[10px] py-[6px] text-[13px] text-ink-2 hover:text-ink"
        >
          <ShoppingCart className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="font-mono text-[10.5px] bg-brand text-brand-ink px-[6px] py-[1px] rounded-full font-medium">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
