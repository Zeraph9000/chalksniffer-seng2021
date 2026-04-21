import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store, OrderMapping } from "@/lib/types";

export default async function SellerDashboard() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });

  if (!store) {
    return (
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome, {session.name}</h1>
        <p className="mb-4">You don&apos;t have a store yet. Create one to start selling.</p>
        <Link href="/dashboard/store" className="inline-block px-6 py-2 bg-black text-white rounded">
          Create store
        </Link>
      </main>
    );
  }

  const all = await db
    .collection<OrderMapping>("orderMappings")
    .find({ storeId: store.storeId })
    .toArray();

  const counts = {
    awaitingDespatch: all.filter((o) => o.status === "paid").length,
    despatched: all.filter((o) => o.status === "despatched").length,
    awaitingConfirmation: all.filter((o) => o.status === "despatched").length,
    completed: all.filter((o) => o.status === "invoiced").length,
    cancelled: all.filter((o) => o.status === "cancelled").length,
  };

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">{store.storeName}</p>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Awaiting despatch" value={counts.awaitingDespatch} />
        <StatCard label="Despatched" value={counts.despatched} />
        <StatCard label="Completed" value={counts.completed} />
        <StatCard label="Cancelled" value={counts.cancelled} />
      </section>

      <nav className="grid md:grid-cols-3 gap-4">
        <DashLink href="/dashboard/store" title="Store settings" desc="Name, description, logo, banner, status" />
        <DashLink href="/dashboard/products" title="Products" desc="Catalogue + variants" />
        <DashLink href="/dashboard/orders" title="Orders" desc="View and manage incoming orders" />
      </nav>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function DashLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block border rounded-lg p-5 hover:shadow-md">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </Link>
  );
}
