import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store, Product } from "@/lib/types";

export default async function DashboardProducts() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
  if (!store) {
    return (
      <main className="p-8">
        <p>You need a store first. <Link href="/dashboard/store" className="underline">Create one</Link>.</p>
      </main>
    );
  }
  const products = await db
    .collection<Product>("products")
    .find({ storeId: store.storeId })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/dashboard/products/new" className="px-4 py-2 bg-black text-white rounded">+ New product</Link>
      </div>
      <div className="border rounded divide-y">
        {products.map((p) => {
          const prices = p.variants.map((v) => v.price);
          const stock = p.variants.reduce((s, v) => s + v.stock, 0);
          return (
            <Link key={p.productId} href={`/dashboard/products/${p.productId}/edit`} className="flex gap-4 p-4 hover:bg-gray-50">
              {p.imageUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrls[0]} className="w-16 h-16 object-cover rounded" alt="" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {p.name}{" "}
                  {!p.available && <span className="text-xs text-gray-500">(archived)</span>}
                </div>
                <div className="text-sm text-gray-600">
                  {p.category} · {p.variants.length} variants · stock {stock}
                </div>
              </div>
              <div className="text-right">
                ${Math.min(...prices).toFixed(2)}
                {prices.length > 1 ? `–$${Math.max(...prices).toFixed(2)}` : ""}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
