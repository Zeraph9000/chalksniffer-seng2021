import clientPromise from "@/lib/db";
import type { Store, Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import { notFound } from "next/navigation";
import { StoreTopNav } from "@/components/ledgr/store-top-nav";
import { StoreHeader } from "@/components/ledgr/store-header";
import { StoreFooter } from "@/components/ledgr/store-footer";
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
        <aside className="sticky top-4 space-y-5">
          <div className="flex justify-between items-center mb-[10px]">
            <h4 className="text-[11.5px] uppercase tracking-[.12em] text-ink-3 font-medium m-0">
              Filters
            </h4>
            <button className="text-[11.5px] text-ink-3">Clear</button>
          </div>
          <div className="text-[13px] text-ink-3 leading-[1.55]">
            Full filter sidebar (category / price / size / tags / in-stock) wires up in the next pass.
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
