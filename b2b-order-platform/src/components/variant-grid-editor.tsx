"use client";
import { useMemo } from "react";
import type { ProductOption, ProductVariant } from "@/lib/types";

type EditorVariant = Omit<ProductVariant, "variantId"> & { variantId?: string };

export function VariantGridEditor({
  options,
  variants,
  onChange,
}: {
  options: ProductOption[];
  variants: EditorVariant[];
  onChange: (v: EditorVariant[]) => void;
}) {
  // Generate all combos from options, preserving existing values where combo matches
  const grid = useMemo<EditorVariant[]>(() => {
    if (options.length === 0) {
      return variants.length > 0 ? variants : [{ optionValues: {}, price: 0, stock: 0 }];
    }
    let combos: Record<string, string>[] = [{}];
    for (const opt of options) {
      const next: Record<string, string>[] = [];
      for (const c of combos) for (const v of opt.values) next.push({ ...c, [opt.name]: v });
      combos = next;
    }
    return combos.map((c) => {
      const existing = variants.find((v) =>
        options.every((o) => v.optionValues[o.name] === c[o.name])
      );
      return existing ? { ...existing, optionValues: c } : { optionValues: c, price: 0, stock: 0 };
    });
  }, [options, variants]);

  function update(idx: number, patch: Partial<EditorVariant>) {
    const next = grid.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    onChange(next);
  }

  function applyPriceToAll(price: number) {
    onChange(grid.map((v) => ({ ...v, price })));
  }

  function applyStockToAll(stock: number) {
    onChange(grid.map((v) => ({ ...v, stock })));
  }

  return (
    <div className="border rounded p-4">
      <div className="flex gap-2 mb-3 text-sm">
        <input
          type="number"
          placeholder="Apply price"
          onChange={(e) => applyPriceToAll(Number(e.target.value))}
          className="border rounded px-2 py-1 w-28"
        />
        <input
          type="number"
          placeholder="Apply stock"
          onChange={(e) => applyStockToAll(Number(e.target.value))}
          className="border rounded px-2 py-1 w-28"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {options.map((o) => <th key={o.name} className="text-left pb-2">{o.name}</th>)}
            <th className="text-left pb-2">Price</th>
            <th className="text-left pb-2" title="Optional 'was' price — shown struck-through on the storefront when higher than Price.">Compare at</th>
            <th className="text-left pb-2">Stock</th>
            <th className="text-left pb-2">SKU</th>
          </tr>
        </thead>
        <tbody>
          {grid.map((v, i) => (
            <tr key={i} className="border-t">
              {options.map((o) => <td key={o.name} className="py-2">{v.optionValues[o.name]}</td>)}
              <td className="py-2">
                <input type="number" value={v.price} onChange={(e) => update(i, { price: Number(e.target.value) })} className="border rounded px-2 py-1 w-24" />
              </td>
              <td className="py-2">
                <input
                  type="number"
                  value={v.compareAtPrice ?? ""}
                  placeholder="—"
                  onChange={(e) => {
                    const raw = e.target.value;
                    update(i, { compareAtPrice: raw === "" ? undefined : Number(raw) });
                  }}
                  className="border rounded px-2 py-1 w-24"
                />
              </td>
              <td className="py-2">
                <input type="number" value={v.stock} onChange={(e) => update(i, { stock: Number(e.target.value) })} className="border rounded px-2 py-1 w-20" />
              </td>
              <td className="py-2">
                <input value={v.sku ?? ""} onChange={(e) => update(i, { sku: e.target.value })} className="border rounded px-2 py-1 w-28" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
