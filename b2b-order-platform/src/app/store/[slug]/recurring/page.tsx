import { notFound } from "next/navigation";
import clientPromise from "@/lib/db";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import type { Store } from "@/lib/types";
import { RecurringList } from "./recurring-list";

export default async function RecurringPage({ params }: { params: { slug: string } }) {
  const db = (await clientPromise).db();
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    const byId = await db.collection<Store>("stores").findOne({ storeId: params.slug });
    if (!byId) return notFound();
    store = await backfillSlugIfMissing(db, byId);
    if (store.slug !== params.slug) return notFound();
  }
  return <RecurringList storeId={store.storeId} storeName={store.storeName} />;
}
