import * as React from "react";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";

export interface StoreHeaderProps {
  shop: {
    monogram: string;
    name: string;
    tagline?: string | null;
    category: string;
    location?: string | null;
    status: "open" | "paused" | "closed";
    productsCount?: number;
  };
}

const statusCopy: Record<StoreHeaderProps["shop"]["status"], string> = {
  open: "Open",
  paused: "Paused",
  closed: "Closed",
};

export function StoreHeader({ shop }: StoreHeaderProps) {
  return (
    <section className="border-b border-line bg-paper px-9 py-11 flex items-center gap-14 flex-wrap">
      <div className="flex items-center gap-6 min-w-0 flex-1">
        <div className="w-20 h-20 rounded-[16px] bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[36px] tracking-[-.025em] shrink-0">
          {shop.monogram}
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] text-ink-3 inline-flex items-center gap-2">
            <StatusDot status={shop.status === "open" ? "open" : shop.status === "paused" ? "low" : "oos"} size={8} />
            <span>
              {shop.category}
              {shop.location ? ` · ${shop.location}` : ""}
            </span>
          </div>
          <h1 className="font-display font-bold text-[34px] tracking-[-.028em] leading-[1.05] my-[6px] text-ink">
            {shop.name}
          </h1>
          {shop.tagline && (
            <p className="text-[14px] text-ink-2 max-w-[540px] leading-[1.55] m-0">{shop.tagline}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-[14px] items-end">
        <div className="flex items-center gap-[14px] flex-wrap justify-end">
          <Chip tone={shop.status === "open" ? "paid" : shop.status === "paused" ? "placed" : "cancelled"} withDot>
            {statusCopy[shop.status]}
          </Chip>
          {typeof shop.productsCount === "number" && (
            <>
              <span className="text-ink-4">·</span>
              <span className="text-[12.5px] text-ink-3">{shop.productsCount} products</span>
            </>
          )}
        </div>
        <div className="flex gap-[6px]">
          <Button variant="ghost" size="sm">
            <Share2 className="h-[13px] w-[13px]" /> Share
          </Button>
        </div>
      </div>
    </section>
  );
}
