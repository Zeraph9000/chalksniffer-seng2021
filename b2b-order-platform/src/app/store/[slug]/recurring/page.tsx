"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RecurringRow = {
  id: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  startDate: string;
  storeId: string;
  itemSummary: string;
};

export default function RecurringPage() {
  const { slug } = useParams<{ slug: string }>();
  const [rows, setRows] = useState<RecurringRow[] | null>(null);

  useEffect(() => {
    fetch("/api/orders/recurring")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RecurringRow[]) => setRows(Array.isArray(data) ? data.filter((r) => r.storeId === slug) : []));
  }, [slug]);

  async function cancel(id: string) {
    if (!confirm("Cancel this recurring order?")) return;
    const res = await fetch(`/api/orders/recurring/${id}`, { method: "DELETE" });
    if (res.ok) setRows((rs) => rs?.filter((r) => r.id !== id) ?? null);
  }

  if (rows === null) return <p>Loading…</p>;

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Recurring orders</h1>
      {rows.length === 0 ? (
        <p className="text-gray-600">No recurring orders at this store.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <div className="font-semibold">{r.frequency} — starts {r.startDate}</div>
                <div className="text-sm text-gray-600">{r.itemSummary}</div>
              </div>
              <button
                type="button"
                onClick={() => cancel(r.id)}
                className="text-red-600 underline"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
