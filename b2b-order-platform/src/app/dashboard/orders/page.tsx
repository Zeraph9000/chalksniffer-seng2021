import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store, OrderMapping } from "@/lib/types";

export default async function DashboardOrders() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
  if (!store) {
    return (
      <main className="p-8">
        <p>Create a store first. <Link href="/dashboard/store" className="underline">Go to store settings</Link>.</p>
      </main>
    );
  }

  const orders = await db
    .collection<OrderMapping>("orderMappings")
    .find({ storeId: store.storeId })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="border rounded divide-y">
          {orders.map((o) => (
            <Link
              key={o.orderId}
              href={`/dashboard/orders/${o.orderId}`}
              className="flex justify-between p-4 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">{o.buyerName} — <span className="text-gray-500">{o.buyerEmail}</span></div>
                <div className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">${o.payableAmount.toFixed(2)} {o.documentCurrencyCode}</div>
                <div className="text-sm"><span className="px-2 py-0.5 rounded bg-gray-100">{o.status}</span></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
