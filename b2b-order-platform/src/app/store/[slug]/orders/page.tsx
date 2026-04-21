import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import clientPromise from "@/lib/db";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import type { OrderMapping, Store } from "@/lib/types";

export default async function StoreBuyerOrders({ params }: { params: { slug: string } }) {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) redirect(`/login?next=/store/${params.slug}/orders`);

  const db = (await clientPromise).db();
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    const byId = await db.collection<Store>("stores").findOne({ storeId: params.slug });
    if (!byId) return notFound();
    store = await backfillSlugIfMissing(db, byId);
    if (store.slug !== params.slug) return notFound();
  }

  const orders = await db
    .collection<OrderMapping>("orderMappings")
    .find({ buyerId: buyer.userId, storeId: store.storeId })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Your orders at {store.storeName}</h1>
      {orders.length === 0 ? (
        <p className="text-gray-600">You haven&apos;t placed any orders here yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.orderId} className="border rounded p-3">
              <Link href={`/store/${params.slug}/orders/${o.orderId}`} className="font-semibold">
                Order {o.orderId}
              </Link>
              <div className="text-sm text-gray-600">
                Status: {o.status} · ${o.payableAmount.toFixed(2)} {o.documentCurrencyCode}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
