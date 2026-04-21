import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clientPromise from "@/lib/db";
import { listActiveStores } from "@/lib/store-service";
import { MarketplaceTopNav } from "@/components/ledgr/marketplace-top-nav";
import { MarketplaceFooter } from "@/components/ledgr/marketplace-footer";
import { Button } from "@/components/ui/button";
import { getSessionOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

const CATEGORY_DOTS: Record<string, string> = {
  pantry: "var(--c-pantry)",
  coffee: "var(--c-coffee)",
  home: "var(--c-home)",
  apparel: "var(--c-apparel)",
  stationery: "var(--c-stat)",
  flowers: "var(--c-flowers)",
  skincare: "var(--c-skin)",
  books: "var(--c-books)",
  kids: "var(--c-kids)",
  vintage: "var(--c-vintage)",
};

const CATEGORIES: Array<{ label: string; key: keyof typeof CATEGORY_DOTS | "all" }> = [
  { label: "All", key: "all" },
  { label: "Pantry & Grocery", key: "pantry" },
  { label: "Coffee & Tea", key: "coffee" },
  { label: "Home & Kitchen", key: "home" },
  { label: "Apparel", key: "apparel" },
  { label: "Stationery", key: "stationery" },
  { label: "Flowers", key: "flowers" },
  { label: "Skincare", key: "skincare" },
  { label: "Books", key: "books" },
  { label: "Kids", key: "kids" },
  { label: "Vintage", key: "vintage" },
];

function monogramFor(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function Landing() {
  const client = await clientPromise;
  const db = client.db();
  const stores = await listActiveStores(db, 6);
  const session = await getSessionOrNull().catch(() => null);

  return (
    <>
      <MarketplaceTopNav user={session ? { name: session.name ?? "You" } : undefined} />

      {/* Category chip row */}
      <div className="px-6 py-[10px] flex gap-[6px] flex-nowrap overflow-hidden border-b border-line-2 bg-paper-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className="h-7 px-3 inline-flex items-center gap-[7px] rounded-full border border-line bg-paper text-ink-2 text-[12px] data-[active=true]:bg-ink data-[active=true]:text-paper data-[active=true]:border-ink whitespace-nowrap"
            data-active={c.key === "all"}
          >
            {c.key !== "all" && (
              <span
                aria-hidden
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: CATEGORY_DOTS[c.key] }}
              />
            )}
            {c.label}
          </button>
        ))}
      </div>

      {/* Hero */}
      <section className="px-6 py-10 grid grid-cols-[1fr_1.25fr] gap-7 items-center">
        <div className="flex flex-col justify-center py-2">
          <div className="text-[12px] font-medium uppercase tracking-[.1em] text-ink-3">
            Independent shops · one checkout
          </div>
          <h1 className="font-display font-semibold text-[56px] leading-[1.02] tracking-[-.03em] my-[14px] mb-[18px] text-ink">
            Shops worth your time, in one place.
          </h1>
          <p className="text-[16px] text-ink-2 max-w-[460px] m-0 mb-[26px] leading-[1.5]">
            Browse thousands of independent storefronts. Fill a cart at one shop, check out once,
            get one tracking link. No tabs, no re-entering your address.
          </p>
          <div className="flex gap-[10px]">
            <Button asChild size="md">
              <Link href="#shops">
                Browse stores <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="md">
              <Link href="/#how">How Ledgr works</Link>
            </Button>
          </div>
        </div>

        {/* Featured shop panel — shows the first active store */}
        {stores[0] ? (
          <FeaturedShopPanel shop={stores[0]} />
        ) : (
          <div className="rounded-[10px] border border-line p-8 text-ink-3 text-center">
            No shops yet — be the first. <Link href="/register?role=seller" className="underline">Open a shop</Link>.
          </div>
        )}
      </section>

      {/* Shops grid */}
      <section id="shops" className="px-6 py-10 border-t border-line-2">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[.1em] text-ink-3">
              Featured this week
            </div>
            <h2 className="font-display font-semibold text-[32px] leading-[1.05] tracking-[-.02em] m-0 mt-2">
              Shops worth your time.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {stores.map((s) => (
            <Link
              key={s.storeId}
              href={s.slug ? `/store/${s.slug}` : "#"}
              className="border border-line rounded-[12px] overflow-hidden bg-paper hover:border-ink-3 transition-colors"
            >
              <div className="aspect-[16/9] bg-brand-soft grid place-items-center">
                <span className="font-display font-bold text-[48px] text-brand-ink tracking-[-.02em]">
                  {s.logoUrl ? null : monogramFor(s.storeName)}
                </span>
              </div>
              <div className="p-4">
                <div className="text-[10.5px] uppercase tracking-[.12em] text-ink-3 font-medium">
                  {s.category}
                </div>
                <div className="mt-1 font-display font-semibold text-[17px] tracking-[-.01em]">
                  {s.storeName}
                </div>
                {s.location && (
                  <div className="text-[12px] text-ink-3 mt-2">{s.location}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works — condensed */}
      <section id="how" className="px-6 py-14 border-t border-line-2">
        <div className="mb-8">
          <div className="text-[12px] font-medium uppercase tracking-[.1em] text-ink-3">
            How Ledgr works
          </div>
          <h2 className="font-display font-semibold text-[32px] leading-[1.05] tracking-[-.02em] m-0 mt-2">
            One shop. One cart. One checkout.
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { n: "01", t: "Browse independent shops", b: "Filter by category, city, or what's newly in stock." },
            { n: "02", t: "Fill a cart from one shop", b: "Carts are per-shop. Switching stores? We'll ask before clearing." },
            { n: "03", t: "Check out once, track everything", b: "One address, one payment, one tracking link per order." },
          ].map((step) => (
            <div key={step.n} className="border border-line rounded-[10px] bg-paper p-[18px]">
              <div className="font-mono text-[10.5px] text-ink-3 tracking-[.12em]">{step.n}</div>
              <div className="font-display font-semibold text-[18px] tracking-[-.015em] mt-2 mb-1">
                {step.t}
              </div>
              <div className="text-[13px] text-ink-2 leading-[1.5]">{step.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Seller CTA */}
      <section className="px-6 py-4 mt-10">
        <div className="rounded-[14px] bg-ink text-[#e8eaee] p-10 grid grid-cols-[1.3fr_1fr] gap-10 items-end relative overflow-hidden">
          <div>
            <div className="text-[11px] uppercase tracking-[.12em] text-ink-4 mb-2">For shops</div>
            <h3 className="font-display font-semibold text-[40px] leading-[1.02] tracking-[-.02em] text-paper m-0 mb-4">
              Open a shop on Ledgr.
            </h3>
            <p className="text-[14.5px] text-ink-4 max-w-[440px] m-0 mb-6 leading-[1.55]">
              Your storefront, your catalog, your invoices. We handle payments, buyer traffic, and
              the paperwork that comes with both.
            </p>
            <div className="flex gap-[10px]">
              <Button asChild>
                <Link href="/register?role=seller" className="!text-ink !bg-paper">
                  Start selling <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-0">
            {[
              { k: "2.9% + 30¢", v: "Per transaction. No setup, no monthly fee." },
              { k: "48 hrs", v: "Median time from signup to first paid order." },
              { k: "Net monthly", v: "Ledgr pays you the first of each month, net of refunds." },
            ].map((x) => (
              <div
                key={x.k}
                className="flex justify-between gap-4 py-4 border-t border-[#1c2128] first:border-t-0"
              >
                <div className="font-mono text-[20px] text-paper tracking-[-.01em]">{x.k}</div>
                <div className="text-[12.5px] text-ink-4 text-right max-w-[200px]">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketplaceFooter />
    </>
  );
}

interface FeaturedShopPanelProps {
  shop: {
    storeId: string;
    storeName: string;
    slug?: string | null;
    category?: string;
    location?: string | null;
  };
}

function FeaturedShopPanel({ shop }: FeaturedShopPanelProps) {
  return (
    <div className="border border-line rounded-[10px] bg-paper overflow-hidden flex flex-col">
      <div className="px-5 py-4 flex items-center gap-3 bg-brand text-brand-ink">
        <div className="w-10 h-10 rounded-lg bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[15px] tracking-[-.015em]">
          {monogramFor(shop.storeName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[15px] tracking-[-.01em] text-brand-ink">
            {shop.storeName}
          </div>
          <div className="text-[11.5px] font-mono text-brand-ink opacity-80 mt-[1px]">
            {shop.category}
            {shop.location ? ` · ${shop.location}` : ""}
          </div>
        </div>
        <span className="font-mono text-[10px] tracking-[.14em] uppercase text-paper bg-ink px-[9px] py-1 rounded-[4px]">
          Featured
        </span>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3 bg-paper">
        {[0, 1].map((i) => (
          <div key={i} className="border border-line rounded-lg overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-brand-soft" />
            <div className="px-3 py-2">
              <div className="text-[12px] font-medium">Placeholder product {i + 1}</div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="font-mono text-[12px] font-medium">—</span>
                <span className="text-[10.5px] text-ink-3">—</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-line-2 flex justify-between items-center text-[12.5px]">
        <span className="text-ink-3 inline-flex items-center gap-[6px]">
          <span className="inline-block w-[6px] h-[6px] rounded-full bg-accent" />
          Visit to see live stock
        </span>
        <Link
          href={shop.slug ? `/store/${shop.slug}` : "#"}
          className="text-ink font-medium"
        >
          Visit shop →
        </Link>
      </div>
    </div>
  );
}
