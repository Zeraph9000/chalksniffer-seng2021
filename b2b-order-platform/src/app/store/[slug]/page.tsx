import clientPromise from "@/lib/db";
import type { Store, Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import { notFound } from "next/navigation";
import { StoreTopNav } from "@/components/ledgr/store-top-nav";
import { StoreHeader } from "@/components/ledgr/store-header";
import { StoreFooter } from "@/components/ledgr/store-footer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getSessionOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

function monogramFor(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function Storefront({ params }: { params: { slug: string } }) {
  const client = await clientPromise;
  const db = client.db();
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    const byId = await db.collection<Store>("stores").findOne({ storeId: params.slug });
    if (!byId) return notFound();
    store = await backfillSlugIfMissing(db, byId);
    if (store.slug !== params.slug) return notFound();
  }
  if (store.status === "closed") return notFound();

  const products = await db
    .collection<Product>("products")
    .find({ storeId: store.storeId, available: true })
    .toArray();
  const session = await getSessionOrNull().catch(() => null);

  const storeNav = {
    slug: store.slug ?? store.storeId,
    name: store.storeName,
    monogram: monogramFor(store.storeName),
  };

  // Category counts (static — filter wiring ships later)
  const categoryCounts = new Map<string, number>();
  for (const p of products) {
    const key = (p.category ?? "").trim();
    if (!key) continue;
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }
  const categories = Array.from(categoryCounts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const inStockCount = products.filter((p) =>
    p.variants?.some((v) => v.stock > 0)
  ).length;

  // Simple price extent across all variants — seeds the range input placeholders.
  const allPrices = products.flatMap((p) => p.variants?.map((v) => v.price) ?? []);
  const priceMin = allPrices.length ? Math.floor(Math.min(...allPrices)) : 0;
  const priceMax = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 0;

  return (
    <>
      <StoreTopNav
        shop={storeNav}
        active="shop"
        user={session ? { name: session.name ?? "You" } : null}
      />
      <StoreHeader
        shop={{
          monogram: monogramFor(store.storeName),
          name: store.storeName,
          tagline: store.description ?? null,
          category: store.category ?? "Shop",
          location: store.location ?? null,
          status: store.status === "active" ? "open" : store.status === "paused" ? "paused" : "closed",
          productsCount: products.length,
        }}
      />

      <section className="px-6 pt-8 pb-0 grid grid-cols-[230px_1fr] gap-8 items-start mx-auto max-w-[1360px]">
        <aside className="sticky top-4">
          <div className="flex justify-between items-center mb-[10px]">
            <h4 className="text-[11.5px] uppercase tracking-[.12em] text-ink-3 font-medium m-0">
              Filters
            </h4>
            <button
              type="button"
              className="text-[11.5px] text-ink-3 hover:text-ink transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Category */}
          <div className="py-4 border-t border-line first:border-t-0 first:pt-0">
            <h5 className="text-[11.5px] uppercase tracking-[.12em] text-ink-3 font-medium m-0 mb-[10px]">
              Category
            </h5>
            <ul className="list-none p-0 m-0 grid gap-[2px]">
              <li>
                <button
                  type="button"
                  className="w-full flex justify-between items-center px-[10px] py-[7px] rounded-[6px] bg-paper-2 text-ink font-medium text-[13px] text-left"
                >
                  <span>All products</span>
                  <span className="font-mono text-[11px] text-ink-4">
                    {products.length}
                  </span>
                </button>
              </li>
              {categories.map(([name, count]) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full flex justify-between items-center px-[10px] py-[7px] rounded-[6px] text-ink-2 text-[13px] text-left hover:bg-paper-2 hover:text-ink transition-colors"
                  >
                    <span className="truncate">{name}</span>
                    <span className="font-mono text-[11px] text-ink-4">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Price */}
          <div className="py-4 border-t border-line">
            <h5 className="text-[11.5px] uppercase tracking-[.12em] text-ink-3 font-medium m-0 mb-[10px]">
              Price
            </h5>
            <div className="flex gap-2 mb-[10px]">
              <div className="relative flex-1">
                <span
                  aria-hidden
                  className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[11.5px] text-ink-4 pointer-events-none"
                >
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  defaultValue={priceMin || ""}
                  placeholder="Min"
                  aria-label="Minimum price"
                  className="h-8 pl-[22px] pr-[10px] text-[12.5px] font-mono rounded-[4px]"
                />
              </div>
              <div className="relative flex-1">
                <span
                  aria-hidden
                  className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[11.5px] text-ink-4 pointer-events-none"
                >
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  defaultValue={priceMax || ""}
                  placeholder="Max"
                  aria-label="Maximum price"
                  className="h-8 pl-[22px] pr-[10px] text-[12.5px] font-mono rounded-[4px]"
                />
              </div>
            </div>
            {/* Range slider placeholder (static) */}
            <div className="relative h-[22px] mt-[6px]">
              <div className="absolute left-0 right-0 top-[10px] h-[2px] bg-line" />
              <div className="absolute left-[10%] right-[40%] top-[10px] h-[2px] bg-ink" />
              <div
                aria-hidden
                className="absolute top-[5px] w-3 h-3 rounded-full bg-paper border-2 border-ink"
                style={{ left: "10%" }}
              />
              <div
                aria-hidden
                className="absolute top-[5px] w-3 h-3 rounded-full bg-paper border-2 border-ink"
                style={{ left: "60%" }}
              />
            </div>
          </div>

          {/* In-stock only */}
          <div className="py-4 border-t border-line">
            <label className="flex items-center gap-[10px] text-[13px] text-ink-2 py-1 cursor-pointer">
              <Checkbox defaultChecked aria-label="In stock only" />
              <span>In stock only</span>
              <span className="ml-auto font-mono text-[11px] text-ink-4">
                {inStockCount}
              </span>
            </label>
          </div>
        </aside>

        <div>
          <div className="flex items-center justify-between pb-[14px] mb-[18px] border-b border-line">
            <div className="flex items-baseline gap-[10px]">
              <div className="font-display text-[20px] font-semibold tracking-[-.015em]">
                All products
              </div>
              <span className="text-[12.5px] text-ink-3">{products.length} products</span>
            </div>
          </div>
          {products.length === 0 ? (
            <div className="py-16 text-center text-ink-3">
              <div className="text-[20px] font-medium text-ink-2">Nothing in this shop yet.</div>
              <div className="mt-2 text-[13px]">Check back soon.</div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-[10px]">
              {products.map((p) => (
                <ProductCard
                  key={p.productId}
                  product={p}
                  storeSlug={store.slug ?? store.storeId}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <StoreFooter
        shop={{
          slug: store.slug ?? store.storeId,
          name: store.storeName,
          monogram: monogramFor(store.storeName),
          address: null,
          abn: null,
        }}
      />
    </>
  );
}
