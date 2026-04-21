import { notFound, redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Product, Store } from "@/lib/types";
import { ProductFormClient } from "../../product-form-client";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const { productId } = await params;

  const client = await clientPromise;
  const db = client.db();

  const store = await db
    .collection<Store>("stores")
    .findOne({ userId: session.userId });
  if (!store) redirect("/dashboard/store");

  const product = await db
    .collection<Product>("products")
    .findOne({ productId });

  if (!product || product.storeId !== store.storeId) notFound();

  // Strip Mongo ObjectId / ensure serialisable dates for the client.
  const serialisable: Product = {
    productId: product.productId,
    storeId: product.storeId,
    name: product.name,
    description: product.description,
    category: product.category,
    imageUrls: product.imageUrls,
    unitCode: product.unitCode,
    currency: product.currency,
    available: product.available,
    options: product.options,
    variants: product.variants,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };

  return <ProductFormClient product={serialisable} storeSlug={store.slug} />;
}
