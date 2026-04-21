import { notFound } from "next/navigation";
import clientPromise from "@/lib/db";
import { getStoreBySlug } from "@/lib/store-service";
import type { Product } from "@/lib/types";
import { ProductDetailClient } from "./product-detail-client";

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
  return <ProductDetailClient store={store} product={product} />;
}
