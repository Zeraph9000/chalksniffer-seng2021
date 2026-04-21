import clientPromise from "@/lib/db";
import type { Store, Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import { notFound } from "next/navigation";
import { transformedImageUrl } from "@/lib/image-url";

export default async function Storefront({ params }: { params: { slug: string } }) {
  const client = await clientPromise;
  const db = client.db();
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    // Legacy fallback: treat the URL segment as a storeId and backfill a slug.
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

  return (
    <>
      <section className="relative">
        {store.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={transformedImageUrl(store.bannerUrl, "banner")} alt="" className="w-full h-48 object-cover" />
        )}
        <div className="max-w-6xl mx-auto px-8 -mt-12 flex items-end gap-4">
          {store.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={transformedImageUrl(store.logoUrl, "logo")}
              alt={store.storeName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white bg-white"
            />
          )}
          <div className="pb-4">
            <h1 className="text-3xl font-bold">{store.storeName}</h1>
            <p className="text-gray-600">{store.category} · {store.location}</p>
            <p className="text-gray-700 mt-2 max-w-2xl">{store.description}</p>
            {store.status === "paused" && (
              <div className="mt-3 bg-yellow-50 text-yellow-800 px-3 py-2 rounded">
                This store is not accepting new orders right now.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 py-10">
        <h2 className="text-xl font-semibold mb-6">Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.productId} product={p} storeSlug={store.slug ?? store.storeId} />
          ))}
        </div>
      </section>
    </>
  );
}
