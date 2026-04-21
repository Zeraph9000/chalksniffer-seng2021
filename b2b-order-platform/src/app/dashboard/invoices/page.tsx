import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { OrderMapping, Store } from "@/lib/types";

export default async function SellerInvoicesPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
  if (!store) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <p>You need a store first. <Link href="/dashboard/store" className="underline">Create one</Link>.</p>
      </main>
    );
  }

  const mappings = await db
    .collection<OrderMapping>("orderMappings")
    .find({ storeId: store.storeId, invoiceId: { $exists: true } })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      {mappings.length === 0 ? (
        <p className="text-gray-500">No invoices yet. They&apos;re created automatically when a buyer confirms receipt of an order.</p>
      ) : (
        <div className="border rounded divide-y">
          {mappings.map((m) => (
            <Link
              key={m.invoiceId}
              href={`/dashboard/invoices/${m.invoiceId}`}
              className="flex justify-between p-4 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium font-mono text-sm">{m.invoiceId}</div>
                <div className="text-sm text-gray-600">
                  {m.buyerName} — {m.buyerEmail}
                </div>
                <div className="text-xs text-gray-500">
                  Order {m.orderId} · {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${m.payableAmount.toFixed(2)} {m.documentCurrencyCode}</div>
                <div className="text-xs text-gray-500">Issued {m.issueDate}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
