import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store } from "@/lib/types";
import { ProductFormClient } from "../product-form-client";

export default async function NewProductPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db
    .collection<Store>("stores")
    .findOne({ userId: session.userId });

  if (!store) redirect("/dashboard/store");

  return <ProductFormClient storeSlug={store.slug} />;
}
