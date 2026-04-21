"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VariantGridEditor } from "@/components/variant-grid-editor";
import { ImageUploadMulti } from "@/components/image-upload-multi";
import type { Product, ProductVariant, ProductOption } from "@/lib/types";

type EditorVariant = Omit<ProductVariant, "variantId"> & { variantId?: string };

export default function EditProduct() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<EditorVariant[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((p: Product) => {
        setProduct(p);
        setVariants(p.variants);
      });
  }, [productId]);

  if (!product) return <main className="p-8">Loading…</main>;

  function updateOption(i: number, patch: Partial<ProductOption>) {
    if (!product) return;
    const next = product.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    setProduct({ ...product, options: next });
  }

  async function save() {
    if (!product) return;
    const res = await fetch(`/api/products/${product.productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        category: product.category,
        imageUrls: product.imageUrls,
        unitCode: product.unitCode,
        currency: product.currency,
        options: product.options,
        variants,
        available: product.available,
      }),
    });
    if (res.ok) {
      router.refresh();
      router.push("/dashboard/products");
    }
    else {
      const d = await res.json();
      setErr(d.message || d.error);
    }
  }

  async function archive() {
    if (!product || !confirm("Archive this product?")) return;
    await fetch(`/api/products/${product.productId}`, { method: "DELETE" });
    router.refresh();
    router.push("/dashboard/products");
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Edit product</h1>

      <section className="space-y-3 mb-6">
        <input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} className="w-full border rounded px-3 py-2" />
        <textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} className="w-full border rounded px-3 py-2" />
        <input value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} className="w-full border rounded px-3 py-2" />
        <div>
          <label className="text-sm font-medium block mb-1">Product images (1–8)</label>
          <ImageUploadMulti
            value={product.imageUrls}
            onChange={(imageUrls) => setProduct({ ...product, imageUrls })}
            max={8}
          />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={product.available} onChange={(e) => setProduct({ ...product, available: e.target.checked })} />
          Available
        </label>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Options</h2>
        {product.options.map((o, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input value={o.name} onChange={(e) => updateOption(i, { name: e.target.value })} className="flex-1 border rounded px-2 py-1" />
            <input
              value={o.values.join(", ")}
              onChange={(e) => updateOption(i, { values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
              className="flex-2 border rounded px-2 py-1"
            />
          </div>
        ))}
      </section>

      <section className="mb-6">
        <VariantGridEditor options={product.options} variants={variants} onChange={setVariants} />
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={save} className="px-6 py-2 bg-black text-white rounded">Save</button>
        <button type="button" onClick={archive} className="px-4 py-2 border border-red-600 text-red-700 rounded">Archive</button>
      </div>
      {err && <p className="text-red-600 mt-3">{err}</p>}
    </main>
  );
}
