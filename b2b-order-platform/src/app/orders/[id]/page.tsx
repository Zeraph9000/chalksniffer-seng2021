import { notFound, redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { backfillSlugIfMissing } from "@/lib/store-service";
import type { OrderMapping, Store } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderDetailLegacy({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { t?: string };
}) {
  const db = (await clientPromise).db();
  const mapping = await db
    .collection<OrderMapping>("orderMappings")
    .findOne({ orderId: params.id });
  if (!mapping) return notFound();

  const store = await db
    .collection<Store>("stores")
    .findOne({ storeId: mapping.storeId });
  if (!store) return notFound();

  const slugged = store.slug ? store : await backfillSlugIfMissing(db, store);
  const slug = slugged.slug ?? slugged.storeId;
  const token = searchParams?.t;
  redirect(`/store/${slug}/orders/${params.id}${token ? `?t=${token}` : ""}`);
}
