"use client";
import { useEffect, useMemo, useState } from "react";
import type { Product, ProductVariant } from "@/lib/types";

export function VariantPicker({ product, onChange }: { product: Product; onChange: (v: ProductVariant | null) => void }) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const matchedVariant = useMemo<ProductVariant | null>(() => {
    if (product.options.length === 0) return product.variants[0] ?? null;
    if (product.options.some((o) => !selected[o.name])) return null;
    return (
      product.variants.find((v) =>
        product.options.every((o) => v.optionValues[o.name] === selected[o.name])
      ) ?? null
    );
  }, [product, selected]);

  useEffect(() => {
    onChange(matchedVariant);
  }, [matchedVariant, onChange]);

  function optionEnabled(optionName: string, value: string): boolean {
    const test = { ...selected, [optionName]: value };
    return product.variants.some(
      (v) =>
        product.options.every((o) => !test[o.name] || v.optionValues[o.name] === test[o.name])
        && v.stock > 0
    );
  }

  if (product.options.length === 0) return null;

  return (
    <div className="space-y-4">
      {product.options.map((opt) => (
        <div key={opt.name}>
          <div className="font-medium mb-2">{opt.name}:</div>
          <div className="flex gap-2 flex-wrap">
            {opt.values.map((v) => {
              const active = selected[opt.name] === v;
              const enabled = optionEnabled(opt.name, v);
              return (
                <button
                  key={v}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setSelected((s) => ({ ...s, [opt.name]: v }))}
                  className={`px-4 py-2 border rounded ${active ? "bg-black text-white" : "bg-white"} ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
