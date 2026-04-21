import * as React from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";

export interface StoreFooterProps {
  shop: {
    slug: string;
    name: string;
    monogram: string;
    address?: string | null;
    abn?: string | null;
  };
  columns?: Array<{ title: string; items: Array<[string, string]> }>;
}

const defaultColumns = [
  { title: "Shop", items: [["All products", "."], ["On sale", "."]] as Array<[string, string]> },
  { title: "Help", items: [["Shipping", "."], ["Returns", "."], ["Contact", "."]] as Array<[string, string]> },
  { title: "Connect", items: [["Instagram", "."], ["Newsletter", "."]] as Array<[string, string]> },
];

export function StoreFooter({ shop, columns = defaultColumns }: StoreFooterProps) {
  return (
    <footer className="mt-20 border-t border-line-2 bg-paper px-6 pt-10 pb-6">
      <div className="mx-auto max-w-[1360px] grid grid-cols-[2fr_1fr_1fr_1fr] gap-8 mb-7">
        <div>
          <div className="flex items-center gap-[10px]">
            <span className="w-[30px] h-[30px] rounded-[7px] bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[13px] tracking-[-.015em]">
              {shop.monogram}
            </span>
            <span className="font-display font-semibold text-[17px] tracking-[-.02em]">{shop.name}</span>
          </div>
          {shop.address && (
            <p className="text-ink-3 text-[12.5px] mt-3 leading-[1.55] max-w-[280px]">
              {shop.address}
              {shop.abn ? <><br />{shop.abn}</> : null}
            </p>
          )}
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h6 className="text-[11px] uppercase tracking-[.12em] text-ink-3 m-0 mb-3 font-medium">
              {col.title}
            </h6>
            <ul className="list-none p-0 m-0 grid gap-[6px]">
              {col.items.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-ink-2 text-[12.5px] hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1360px] flex justify-between items-center pt-[18px] border-t border-line-2 text-ink-3 text-[12px]">
        <div>© 2026 {shop.name}</div>
        <div className="inline-flex items-center gap-[7px] text-ink-4">
          Powered by <BrandLockup size="sm" href="/" />
        </div>
      </div>
    </footer>
  );
}
