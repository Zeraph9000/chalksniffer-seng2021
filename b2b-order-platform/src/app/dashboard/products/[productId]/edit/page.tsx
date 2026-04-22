import { notFound, redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Product, Store, OrderMapping } from "@/lib/types";
import { ProductFormClient } from "../../product-form-client";
import { DashboardShell } from "@/components/ledgr/dashboard-shell";

function monogramFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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

  const awaitingDespatch = await db
    .collection<OrderMapping>("orderMappings")
    .countDocuments({ storeId: store.storeId, status: "paid" });

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

  return (
    <DashboardShell
      store={{
        monogram: monogramFrom(store.storeName),
        name: store.storeName,
        status: store.status,
        slug: store.slug,
      }}
      user={{ name: session.name, initials: monogramFrom(session.name) }}
      active="products"
      ordersBadge={awaitingDespatch}
    >
      <ProductFormClient product={serialisable} storeSlug={store.slug} />
    </DashboardShell>
  );
}
