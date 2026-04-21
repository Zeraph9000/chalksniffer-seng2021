import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { OrderMapping } from "@/lib/types";

export default async function MyOrders() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");

  const client = await clientPromise;
  const db = client.db();
  const orders = await db
    .collection<OrderMapping>("orderMappings")
    .find({ buyerId: session.userId })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">
          No orders yet. <Link href="/marketplace" className="underline">Browse stores</Link>.
        </p>
      ) : (
        <div className="border rounded divide-y">
          {orders.map((o) => (
            <Link
              key={o.orderId}
              href={`/orders/${o.orderId}`}
              className="flex justify-between p-4 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">Order {o.orderId}</div>
                <div className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div>${o.payableAmount.toFixed(2)}</div>
                <div className="text-sm">
                  <span className="px-2 py-0.5 rounded bg-gray-100">{o.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
