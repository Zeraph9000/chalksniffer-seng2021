import { notFound } from "next/navigation";
import clientPromise from "@/lib/db";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import type { Store } from "@/lib/types";
import { StorefrontHeader } from "@/components/storefront-header";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const db = (await clientPromise).db();
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    const byId = await db.collection<Store>("stores").findOne({ storeId: params.slug });
    if (!byId) return notFound();
    store = await backfillSlugIfMissing(db, byId);
    if (store.slug !== params.slug) return notFound();
  }
  return (
    <>
      <StorefrontHeader store={store} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
