import { notFound } from "next/navigation";
import Link from "next/link";
import clientPromise from "@/lib/db";
import { getStoreBySlug } from "@/lib/store-service";
import type { Product } from "@/lib/types";
import { StoreTopNav } from "@/components/ledgr/store-top-nav";
import { StoreFooter } from "@/components/ledgr/store-footer";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionOrNull } from "@/lib/session";
import { ProductDetailClient } from "./product-detail-client";

export const dynamic = "force-dynamic";

function monogramFor(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string; productId: string };
}) {
  const db = (await clientPromise).db();
  const store = await getStoreBySlug(db, params.slug);
  if (!store) return notFound();

  const product = await db
    .collection<Product>("products")
    .findOne({ productId: params.productId, storeId: store.storeId });
  if (!product) return notFound();

  const session = await getSessionOrNull().catch(() => null);
  const storeSlug = store.slug ?? store.storeId;
  const storeMonogram = monogramFor(store.storeName);

  const storeNav = {
    slug: storeSlug,
    name: store.storeName,
    monogram: storeMonogram,
  };

  // Meta facts only rendered when we actually have the value
  const metaFacts: Array<{ k: string; l: string }> = [];
  if (product.category) metaFacts.push({ k: product.category, l: "Category" });
  if (product.unitCode) metaFacts.push({ k: product.unitCode, l: "Unit code" });
  if (product.currency) metaFacts.push({ k: product.currency, l: "Currency" });
  if (product.variants?.length) {
    metaFacts.push({
      k: String(product.variants.length),
      l: product.variants.length === 1 ? "Variant" : "Variants",
    });
  }

  const trimmedDescription = (product.description ?? "").trim();

  return (
    <>
      <StoreTopNav
        shop={storeNav}
        active="shop"
        user={session ? { name: session.name ?? "You" } : null}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-[1360px] px-6 pt-[14px] pb-[10px] flex items-center gap-2 text-[12px] text-ink-3"
      >
        <Link href={`/store/${storeSlug}`} className="text-ink-3 hover:text-ink transition-colors">
          Shop
        </Link>
        <span className="text-ink-4">/</span>
        <Link
          href={`/store/${storeSlug}`}
          className="text-ink-3 hover:text-ink transition-colors"
        >
          {product.category}
        </Link>
        <span className="text-ink-4">/</span>
        <span className="text-ink font-medium">{product.name}</span>
      </nav>

      {/* Main: Gallery + Info */}
      <div className="mx-auto max-w-[1360px] px-6 pb-12">
        <ProductDetailClient
          store={store}
          product={product}
          storeSlug={storeSlug}
          storeMonogram={storeMonogram}
        />

        {/* ProductDescription section */}
        <section className="mt-14 pt-14 border-t border-line-2 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12">
          <div>
            {trimmedDescription ? (
              <>
                <div className="font-sans text-[11px] font-medium uppercase tracking-[.12em] text-ink-3">
                  About this product
                </div>
                <p className="font-display text-[20px] font-medium leading-[1.4] tracking-[-.01em] mt-[10px] mb-[18px] text-ink max-w-[640px]">
                  {trimmedDescription.split(/\n{2,}/)[0]}
                </p>
                {trimmedDescription.split(/\n{2,}/).slice(1).length > 0 && (
                  <div className="text-[14px] text-ink-2 leading-[1.65] max-w-[640px] space-y-3">
                    {trimmedDescription
                      .split(/\n{2,}/)
                      .slice(1)
                      .map((para, i) => (
                        <p key={i} className="m-0 whitespace-pre-line">
                          {para}
                        </p>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="No description yet"
                body="The shop hasn't added a description for this product. Check back soon or browse other items."
              />
            )}
          </div>

          {metaFacts.length > 0 && (
            <div className="flex flex-col gap-6">
              {metaFacts.map((m) => (
                <div key={`${m.l}-${m.k}`}>
                  <div className="font-display text-[20px] font-semibold tracking-[-.015em] text-ink">
                    {m.k}
                  </div>
                  <div className="text-[11px] uppercase tracking-[.1em] text-ink-3 mt-[10px]">
                    {m.l}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <StoreFooter
        shop={{
          slug: storeSlug,
          name: store.storeName,
          monogram: storeMonogram,
          address: null,
          abn: null,
        }}
      />
    </>
  );
}
