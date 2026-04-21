import * as React from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";

const columns = [
  { title: "Shop", items: [["All stores", "/"], ["New this week", "/"], ["Near you", "/"], ["Gift cards", "/"]] },
  { title: "Sell", items: [["Start a store", "/register?role=seller"], ["Seller pricing", "/"], ["Seller guide", "/"], ["API", "/"]] },
  { title: "Company", items: [["About", "/"], ["Careers", "/"], ["Press", "/"], ["Blog", "/"]] },
  { title: "Support", items: [["Help center", "/"], ["Contact", "/"], ["Returns", "/"], ["Shipping", "/"]] },
];

export function MarketplaceFooter() {
  return (
    <footer className="border-t border-line-2 bg-paper px-6 pt-12 pb-8 mt-20">
      <div className="mx-auto max-w-[1360px] grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-8">
        <div>
          <BrandLockup size="md" />
          <p className="text-[13px] text-ink-3 max-w-[280px] mt-4 leading-relaxed">
            A marketplace of independent shops. One checkout, thousands of makers.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h5 className="text-[11.5px] uppercase tracking-[0.12em] text-ink-3 mb-3.5 font-medium">
              {col.title}
            </h5>
            <ul className="grid gap-2 list-none m-0 p-0">
              {col.items.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-[13px] text-ink-2 hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1360px] flex justify-between items-center mt-10 pt-6 border-t border-line-2 text-[12px] text-ink-3">
        <div>© 2026 Ledgr Pty Ltd · ABN 00 000 000 000</div>
        <div className="flex gap-5">
          <Link href="/">Privacy</Link>
          <Link href="/">Terms</Link>
          <Link href="/">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
