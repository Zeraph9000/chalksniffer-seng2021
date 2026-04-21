import clientPromise from "@/lib/db";
import type { Store, Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { notFound } from "next/navigation";

export default async function Storefront({ params }: { params: { storeId: string } }) {
  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ storeId: params.storeId });
  if (!store || store.status === "closed") return notFound();

  const products = await db
    .collection<Product>("products")
    .find({ storeId: params.storeId, available: true })
    .toArray();

  return (
    <main>
      <section className="relative">
        {store.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.bannerUrl} alt="" className="w-full h-48 object-cover" />
        )}
        <div className="max-w-6xl mx-auto px-8 -mt-12 flex items-end gap-4">
          {store.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
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
            <ProductCard key={p.productId} product={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
