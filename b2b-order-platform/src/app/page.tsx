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
              <Link href="/store/acme-bakery">
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
      <section id="how" className="px-10 py-[72px] border-t border-line-2 mx-auto max-w-[1360px]">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[.1em] text-ink-3">
              How Ledgr works
            </div>
            <h2 className="font-display font-semibold text-[32px] leading-[1.05] tracking-[-.02em] m-0 mt-2">
              One shop. One cart. One checkout.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <HowStepBrowse />
          <HowStepCart />
          <HowStepEmail />
        </div>
      </section>

      {/* Seller CTA */}
      <section className="px-10 pt-4 pb-[72px] mx-auto max-w-[1360px]">
        <div className="rounded-[14px] bg-[#0d0f12] text-[#e8eaee] p-14 grid grid-cols-[1.3fr_1fr] gap-10 items-end relative overflow-hidden">
          {/* Decorative concentric circles — top right */}
          <span
            aria-hidden
            className="absolute -top-20 -right-20 w-[360px] h-[360px] rounded-full border border-[#1c2128] pointer-events-none"
          />
          <span
            aria-hidden
            className="absolute -top-10 -right-10 w-[280px] h-[280px] rounded-full border border-[#1c2128] pointer-events-none"
          />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-[18px] opacity-90">
              <span className="font-display font-bold text-[18px] tracking-[-.03em] text-paper">
                Ledg<em className="not-italic text-hot font-medium italic">r</em>
              </span>
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[.12em] text-[#8a93a0] mb-[10px]">
              For shops
            </div>
            <h3 className="font-display font-semibold text-[40px] leading-[1.02] tracking-[-.02em] text-paper m-0 mb-4">
              Open a shop on Ledgr.
            </h3>
            <p className="text-[14.5px] text-[#a6acb6] max-w-[440px] m-0 mb-6 leading-[1.55]">
              Your storefront, your catalog, your invoices. We handle payments, buyer traffic, and
              the paperwork that comes with both.
            </p>
            <div className="flex gap-[10px]">
              <Link
                href="/register?role=seller"
                className="inline-flex items-center gap-2 h-[42px] px-[18px] rounded-[6px] bg-paper text-[#0d0f12] font-medium text-[13.5px]"
              >
                Start selling <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 h-[42px] px-[18px] rounded-[6px] bg-transparent text-paper border border-[#2a3039] font-medium text-[13.5px]"
              >
                Pricing &amp; fees
              </Link>
            </div>
          </div>
          <div className="relative z-10 grid gap-0">
            {[
              { k: "2.9% + 30¢", v: "Per transaction. No setup, no monthly fee." },
              { k: "48 hrs", v: "Median time from signup to first paid order." },
              { k: "Net monthly", v: "Ledgr pays you the first of each month, net of refunds." },
            ].map((x, i) => (
              <div
                key={x.k}
                className={`flex justify-between gap-4 py-4 border-t border-[#1c2128] ${
                  i === 2 ? "border-b" : ""
                }`}
              >
                <div className="font-mono text-[20px] text-paper tracking-[-.01em]">{x.k}</div>
                <div className="text-[12.5px] text-[#8a93a0] text-right max-w-[200px]">{x.v}</div>
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
        <Link href="/store/acme-bakery" className="text-ink font-medium">
          Visit shop →
        </Link>
      </div>
    </div>
  );
}

/* How-it-works step cards — each with a mini-UI preview */

function HowStepCard({ n, title, body, preview }: { n: string; title: string; body: string; preview: React.ReactNode }) {
  return (
    <div className="border border-line rounded-[10px] bg-paper overflow-hidden flex flex-col">
      <div className="h-[200px] bg-paper-2 border-b border-line-2 relative overflow-hidden p-4">
        {preview}
      </div>
      <div className="px-[18px] pt-[18px] pb-5">
        <div className="font-mono text-[10.5px] text-ink-3 tracking-[.12em]">{n}</div>
        <div className="font-display font-semibold text-[18px] tracking-[-.015em] mt-[6px] mb-[6px]">
          {title}
        </div>
        <div className="text-[13px] text-ink-2 leading-[1.5]">{body}</div>
      </div>
    </div>
  );
}

/* Step 1 preview — three stacked mini-store tiles */
function HowStepBrowse() {
  const tiles: Array<{ art: string; textColor: string; cat: string; name: string; mark: string; top: string; left: string; opacity: string; z: string }> = [
    { art: "#b97e29", textColor: "#1a1208", cat: "Pantry · NSW", name: "Honey House", mark: "HH", top: "top-6", left: "left-6", opacity: "opacity-100", z: "z-30" },
    { art: "#4a6e4b", textColor: "#f3f5ec", cat: "Stationery · VIC", name: "The Good Press", mark: "GP", top: "top-[60px]", left: "left-[76px]", opacity: "opacity-85", z: "z-20" },
    { art: "#3d5a6c", textColor: "#eaf1f6", cat: "Coffee · NSW", name: "Lowtide Coffee", mark: "LT", top: "top-[96px]", left: "left-[128px]", opacity: "opacity-65", z: "z-10" },
  ];
  return (
    <HowStepCard
      n="01"
      title="Browse independent shops"
      body="Filter by category, city, or what's newly in stock. Every shop keeps its own storefront — its own rhythm, its own catalog."
      preview={
        <>
          {tiles.map((t) => (
            <div
              key={t.mark}
              className={`absolute ${t.top} ${t.left} ${t.opacity} ${t.z} w-[140px] bg-paper border border-line rounded-[8px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]`}
            >
              <div
                className="h-[60px] rounded-t-[7px] grid place-items-center font-display font-bold text-[15px] tracking-[-.015em]"
                style={{ background: t.art, color: t.textColor }}
              >
                {t.mark}
              </div>
              <div className="px-[10px] pt-2 pb-[10px]">
                <div className="font-mono text-[8.5px] tracking-[.1em] uppercase text-ink-3">
                  {t.cat}
                </div>
                <div className="text-[11px] font-medium mt-[2px]">{t.name}</div>
              </div>
            </div>
          ))}
        </>
      }
    />
  );
}

/* Step 2 preview — mini cart drawer */
function HowStepCart() {
  return (
    <HowStepCard
      n="02"
      title="Fill a cart from one shop"
      body="Carts on Ledgr are per-shop. Switching stores? We'll ask before clearing the cart — no surprises at checkout."
      preview={
        <div className="absolute inset-4 bg-paper border border-line rounded-[8px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="px-3 py-[10px] border-b border-line-2 flex justify-between items-center">
            <div className="text-[11px] font-medium">Your cart</div>
            <div className="text-[9.5px] text-ink-3">Honey House</div>
          </div>
          {[
            { bg: "#e8c265", name: "Raw honey · 500g", price: "$18" },
            { bg: "#c69a5a", name: "Flour · 1kg", price: "$9" },
          ].map((item) => (
            <div key={item.name} className="px-3 py-2 flex gap-2 items-center border-b border-line-2">
              <div className="w-[26px] h-[26px] rounded flex-shrink-0" style={{ background: item.bg }} />
              <div className="text-[10.5px] flex-1 min-w-0">{item.name}</div>
              <div className="font-mono text-[10px]">{item.price}</div>
            </div>
          ))}
          <div className="px-3 py-[10px] flex justify-between items-center">
            <div className="text-[10px] text-ink-3">Subtotal</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px]">$27.00</span>
              <span className="bg-ink text-paper text-[10px] font-medium px-[9px] py-[5px] rounded">
                Checkout →
              </span>
            </div>
          </div>
        </div>
      }
    />
  );
}

/* Step 3 preview — mini confirmation email */
function HowStepEmail() {
  return (
    <HowStepCard
      n="03"
      title="Check out once, track everything"
      body="One address, one payment, one confirmation email per order. The shop handles despatch; your tracking link lands in the same inbox."
      preview={
        <div className="absolute inset-4 bg-paper border border-line rounded-[8px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="h-[18px] bg-paper-2 border-b border-line-2 flex items-center px-2 gap-1">
            <span className="w-[6px] h-[6px] rounded-full bg-[#ef4444]" />
            <span className="w-[6px] h-[6px] rounded-full bg-[#f59e0b]" />
            <span className="w-[6px] h-[6px] rounded-full bg-[#10b981]" />
          </div>
          <div className="px-[14px] pt-[14px] pb-3">
            <div className="font-mono text-[9px] text-ink-3 tracking-[.04em]">
              From Honey House · via Ledgr
            </div>
            <div className="font-display font-semibold text-[13px] mt-1 tracking-[-.01em]">
              Your order is on its way
            </div>
            <div className="mt-[10px] px-[10px] py-2 bg-paper-2 rounded-[6px] flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium">Australia Post Express</div>
                <div className="font-mono text-[9.5px] text-accent tracking-[.04em]">
                  ARR 4UEJ93 71
                </div>
              </div>
            </div>
            <div className="mt-2 font-mono text-[9px] text-ink-3">
              ETA <span className="text-ink">Wed 24 Apr</span> ·{" "}
              <span className="text-ink underline underline-offset-2">Track parcel</span>
            </div>
          </div>
        </div>
      }
    />
  );
}
