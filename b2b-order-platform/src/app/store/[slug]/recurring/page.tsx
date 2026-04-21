import { notFound, redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import type { Store } from "@/lib/types";
import { StoreTopNav } from "@/components/ledgr/store-top-nav";
import { RecurringList } from "./recurring-list";

export const dynamic = "force-dynamic";

function monogramFor(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function RecurringPage({
  params,
}: {
  params: { slug: string };
}) {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) redirect(`/login?next=/store/${params.slug}/recurring`);

  const db = (await clientPromise).db();
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    const byId = await db
      .collection<Store>("stores")
      .findOne({ storeId: params.slug });
    if (!byId) return notFound();
    store = await backfillSlugIfMissing(db, byId);
    if (store.slug !== params.slug) return notFound();
  }

  const storeNav = {
    slug: store.slug ?? store.storeId,
    name: store.storeName,
    monogram: monogramFor(store.storeName),
  };

  return (
    <>
      <StoreTopNav
        shop={storeNav}
        active="recurring"
        user={{ name: buyer.name }}
      />
      <RecurringList
        storeId={store.storeId}
        storeSlug={store.slug ?? store.storeId}
        storeName={store.storeName}
      />
    </>
  );
}
