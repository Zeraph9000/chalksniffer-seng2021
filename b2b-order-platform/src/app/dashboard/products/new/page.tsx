"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { VariantGridEditor } from "@/components/variant-grid-editor";
import type { ProductOption, ProductVariant } from "@/lib/types";

type EditorVariant = Omit<ProductVariant, "variantId">;

export default function NewProduct() {
  const router = useRouter();
  const [basics, setBasics] = useState({ name: "", description: "", category: "", imageUrl: "", unitCode: "each", currency: "AUD" });
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<EditorVariant[]>([{ optionValues: {}, price: 0, stock: 0 }]);
  const [err, setErr] = useState<string | null>(null);

  function addOption() {
    if (options.length >= 3) return;
    setOptions([...options, { name: "", values: [] }]);
  }

  function updateOption(i: number, patch: Partial<ProductOption>) {
    setOptions(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  async function save() {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...basics, options, variants }),
    });
    if (res.ok) {
      // Invalidate the server-rendered product list so the new product shows up
      // immediately without a manual refresh.
      router.refresh();
      router.push("/dashboard/products");
    }
    else {
      const d = await res.json();
      setErr(d.message || d.error);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">New product</h1>

      <section className="space-y-3 mb-6">
        <input placeholder="Name" value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })} className="w-full border rounded px-3 py-2" />
        <textarea placeholder="Description" value={basics.description} onChange={(e) => setBasics({ ...basics, description: e.target.value })} className="w-full border rounded px-3 py-2" />
        <input placeholder="Category" value={basics.category} onChange={(e) => setBasics({ ...basics, category: e.target.value })} className="w-full border rounded px-3 py-2" />
        <input placeholder="Image URL" value={basics.imageUrl} onChange={(e) => setBasics({ ...basics, imageUrl: e.target.value })} className="w-full border rounded px-3 py-2" />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Unit (each/kg)" value={basics.unitCode} onChange={(e) => setBasics({ ...basics, unitCode: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Currency" value={basics.currency} onChange={(e) => setBasics({ ...basics, currency: e.target.value })} className="border rounded px-3 py-2" />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Options (optional)</h2>
        {options.map((o, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input placeholder="Option name (e.g. Size)" value={o.name} onChange={(e) => updateOption(i, { name: e.target.value })} className="flex-1 border rounded px-2 py-1" />
            <input
              placeholder="Values (S, M, L)"
              value={o.values.join(", ")}
              onChange={(e) => updateOption(i, { values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
              className="flex-2 border rounded px-2 py-1"
            />
          </div>
        ))}
        {options.length < 3 && (
          <button type="button" onClick={addOption} className="text-blue-600 underline text-sm">+ Add option</button>
        )}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Variants</h2>
        <VariantGridEditor options={options} variants={variants} onChange={setVariants} />
      </section>

      <button type="button" onClick={save} className="px-6 py-2 bg-black text-white rounded">Create product</button>
      {err && <p className="text-red-600 mt-3">{err}</p>}
    </main>
  );
}
