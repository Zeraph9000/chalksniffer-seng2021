import { StoreCard } from "@/components/store-card";
import clientPromise from "@/lib/db";
import type { Store } from "@/lib/types";

export default async function Marketplace() {
  const client = await clientPromise;
  const stores = await client
    .db()
    .collection<Store>("stores")
    .find({ status: { $ne: "closed" } })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Stores on Chalksniffer</h1>
      {stores.length === 0 ? (
        <p className="text-gray-500">No stores yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((s) => (
            <StoreCard key={s.storeId} store={s} />
          ))}
        </div>
      )}
    </main>
  );
}
