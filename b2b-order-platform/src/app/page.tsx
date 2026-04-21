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
      <section className="px-10 py-10 grid grid-cols-[1fr_1.25fr] gap-7 items-center mx-auto max-w-[1360px]">
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

        {/* Hardcoded featured shop panel — Honey House Provisions */}
        <HardcodedFeaturedPanel />
      </section>

      {/* How it works */}
      <section id="how" className="px-10 py-14 border-t border-line-2 mx-auto max-w-[1360px]">
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
            {
              n: "01",
              t: "Browse independent shops",
              b: "Filter by category, city, or what's newly in stock. Every shop keeps its own storefront — its own rhythm, its own catalog.",
            },
            {
              n: "02",
              t: "Fill a cart from one shop",
              b: "Carts on Ledgr are per-shop. Switching stores? We'll ask before clearing the cart — no surprises at checkout.",
            },
            {
              n: "03",
              t: "Check out once, track everything",
              b: "One address, one payment, one confirmation email. The shop handles despatch; your tracking link lands in the same inbox.",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="border border-line rounded-[10px] bg-paper overflow-hidden flex flex-col"
            >
              <div className="h-[160px] bg-paper-2 border-b border-line-2 grid place-items-center">
                <span className="font-mono text-[24px] text-ink-4 tracking-[.1em]">{step.n}</span>
              </div>
              <div className="p-[18px]">
                <div className="font-mono text-[10.5px] text-ink-3 tracking-[.12em]">
                  Step {step.n}
                </div>
                <div className="font-display font-semibold text-[18px] tracking-[-.015em] mt-[6px] mb-[6px]">
                  {step.t}
                </div>
                <div className="text-[13px] text-ink-2 leading-[1.5]">{step.b}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Seller CTA */}
      <section className="px-10 py-4 mt-10 mx-auto max-w-[1360px]">
        <div className="rounded-[14px] bg-ink text-[#e8eaee] p-14 grid grid-cols-[1.3fr_1fr] gap-10 items-end relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[11px] uppercase tracking-[.12em] text-ink-4 mb-2">For shops</div>
            <h3 className="font-display font-semibold text-[40px] leading-[1.02] tracking-[-.02em] text-paper m-0 mb-4">
              Open a shop on Ledgr.
            </h3>
            <p className="text-[14.5px] text-ink-4 max-w-[440px] m-0 mb-6 leading-[1.55]">
              Your storefront, your catalog, your invoices. We handle payments, buyer traffic, and
              the paperwork that comes with both.
            </p>
            <Link
              href="/register?role=seller"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-[10px] bg-paper text-ink font-display font-semibold text-[14px]"
            >
              Start selling <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative z-10 grid gap-0">
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

/* Hardcoded featured shop panel — Honey House Provisions mock */
function HardcodedFeaturedPanel() {
  const products = [
    { name: "Stringybark Raw Honey", sizes: "2 sizes", price: "$18", bg: "#e8c265" },
    { name: "First-Press Olive Oil", sizes: "500ml · 1L", price: "$28", bg: "#8aa860" },
  ];
  return (
    <div
      className="border border-line rounded-[10px] bg-paper overflow-hidden flex flex-col"
      style={
        {
          ["--brand" as any]: "#b97e29",
          ["--brand-ink" as any]: "#2a1a08",
          ["--brand-soft" as any]: "#f4e2b8",
          ["--brand-surface" as any]: "#1a1208",
          ["--brand-contrast" as any]: "#f7eacb",
        } as React.CSSProperties
      }
    >
      <div className="px-[18px] py-4 flex items-center gap-3 bg-brand text-brand-ink">
        <div className="w-10 h-10 rounded-lg bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[15px] tracking-[-.015em]">
          HH
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[15px] tracking-[-.01em] text-brand-ink">
            Honey House Provisions
          </div>
          <div className="text-[11.5px] font-mono text-brand-ink/80 mt-[1px]">
            Pantry &amp; Grocery · Marrickville, NSW
          </div>
        </div>
        <span className="font-mono text-[10px] tracking-[.14em] uppercase text-paper bg-ink px-[9px] py-1 rounded-[4px]">
          Featured
        </span>
      </div>
      <div className="p-[14px] grid grid-cols-2 gap-[10px]">
        {products.map((p) => (
          <div key={p.name} className="border border-line rounded-lg overflow-hidden flex flex-col">
            <div className="aspect-[4/3]" style={{ background: p.bg }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 200 150"
                preserveAspectRatio="xMidYMid meet"
              >
                <g fill="#2a1a08">
                  <rect x="78" y="32" width="44" height="10" rx="1" />
                  <rect x="74" y="42" width="52" height="4" />
                  <path d="M76 46 h48 v76 a5 5 0 0 1 -5 5 h-38 a5 5 0 0 1 -5 -5 z" />
                </g>
              </svg>
            </div>
            <div className="px-[10px] pt-2 pb-[10px]">
              <div className="text-[12px] font-medium text-ink leading-[1.3] tracking-[-.005em]">
                {p.name}
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="font-mono text-[12px] font-medium text-ink">{p.price}</span>
                <span className="text-[10.5px] text-ink-3">{p.sizes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-[18px] py-3 border-t border-line-2 flex justify-between items-center text-[12.5px]">
        <span className="text-ink-3 inline-flex items-center gap-[6px]">
          <span className="inline-block w-[6px] h-[6px] rounded-full bg-accent" />
          Open · 48 products in stock
        </span>
        <Link href="#shops" className="text-ink font-medium">
          Visit shop →
        </Link>
      </div>
    </div>
  );
}
