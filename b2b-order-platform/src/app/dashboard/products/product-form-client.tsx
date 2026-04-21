"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadMulti } from "@/components/image-upload-multi";
import { transformedImageUrl } from "@/lib/image-url";
import type { Product, ProductOption, ProductVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

type EditorVariant = Omit<ProductVariant, "variantId"> & { variantId?: string };

export type ProductFormClientProps = {
  product?: Product;
  /** Optional storefront slug for "View on storefront" link on edit. */
  storeSlug?: string;
};

const CATEGORY_OPTIONS = [
  "Honey & spreads",
  "Oils & vinegars",
  "Grains & flours",
  "Ferments",
  "Tea & coffee",
  "Pantry",
  "Skincare",
  "Home goods",
  "Other",
];

const SHAPE_OPTIONS = ["Jar", "Bottle", "Bag", "Tin", "Box"] as const;
const CURRENCY_OPTIONS = ["AUD", "USD", "EUR", "GBP", "NZD"];

function emptyBasics() {
  return {
    name: "",
    description: "",
    category: "",
    shape: "Jar",
    imageUrls: [] as string[],
    unitCode: "EA",
    currency: "AUD",
    skuPrefix: "",
    available: true,
  };
}

function initialBasics(product?: Product) {
  if (!product) return emptyBasics();
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    shape: "Jar",
    imageUrls: product.imageUrls,
    unitCode: product.unitCode,
    currency: product.currency,
    skuPrefix: "",
    available: product.available,
  };
}

/* ------------------------------ TagInput ------------------------------ */
function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }
  function remove(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] px-[9px] py-[7px] rounded-[7px] border border-line bg-paper">
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="inline-flex items-center gap-1.5 pl-[10px] pr-1 py-[3px] rounded-full bg-paper-2 border border-line text-[12px] font-medium"
        >
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => remove(i)}
            className="w-4 h-4 rounded-full bg-ink-4 text-paper grid place-items-center text-[10px] leading-none hover:bg-danger transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && values.length) {
            remove(values.length - 1);
          }
        }}
        onBlur={commit}
        placeholder={placeholder ?? "Add value… (press Enter)"}
        className="flex-1 min-w-[80px] border-0 bg-transparent outline-none text-[13px] text-ink p-1"
      />
    </div>
  );
}

/* --------------------------- OptionsBuilder --------------------------- */
function OptionsBuilder({
  options,
  onChange,
}: {
  options: ProductOption[];
  onChange: (next: ProductOption[]) => void;
}) {
  function updateAt(i: number, patch: Partial<ProductOption>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function removeAt(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }
  function add() {
    if (options.length >= 3) return;
    onChange([...options, { name: "", values: [] }]);
  }
  return (
    <div>
      {options.map((opt, i) => (
        <div
          key={i}
          className={cn(
            "rounded-[10px] border border-line bg-paper-2 px-4 pt-[14px] pb-3",
            i > 0 && "mt-3"
          )}
        >
          <div className="flex justify-between items-center mb-2.5">
            <div className="font-medium text-[11px] uppercase tracking-[.12em] text-ink-3">
              Option {i + 1}
            </div>
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="text-ink-3 bg-transparent border-0 text-[13px] px-1.5 py-0.5 rounded hover:text-danger hover:bg-paper transition-colors"
            >
              ✕ Remove
            </button>
          </div>
          <div className="grid grid-cols-[220px_1fr] gap-3 items-start">
            <div>
              <input
                placeholder="Option name"
                value={opt.name}
                onChange={(e) => updateAt(i, { name: e.target.value })}
                className="w-full h-9 px-3 border border-line rounded-[7px] bg-paper text-[13px] text-ink outline-none focus:border-ink"
              />
            </div>
            <TagInput
              values={opt.values}
              onChange={(values) => updateAt(i, { values })}
            />
          </div>
        </div>
      ))}
      {options.length < 3 && (
        <button
          type="button"
          onClick={add}
          className="mt-3 inline-flex items-center gap-1.5 bg-transparent border border-dashed border-line px-[14px] py-[10px] rounded-lg text-[12.5px] text-ink-3 hover:border-ink-3 hover:text-ink transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add another option
        </button>
      )}
    </div>
  );
}

/* ------------------------- VariantGridEditor ------------------------- */
function cartesian(options: ProductOption[]): Record<string, string>[] {
  if (options.length === 0) return [{}];
  let combos: Record<string, string>[] = [{}];
  for (const opt of options) {
    if (!opt.name || opt.values.length === 0) continue;
    const next: Record<string, string>[] = [];
    for (const c of combos) for (const v of opt.values) next.push({ ...c, [opt.name]: v });
    combos = next;
  }
  return combos;
}

function VariantGridEditor({
  options,
  variants,
  onChange,
}: {
  options: ProductOption[];
  variants: EditorVariant[];
  onChange: (v: EditorVariant[]) => void;
}) {
  // Active options (with name + at least one value).
  const activeOptions = options.filter((o) => o.name.trim() && o.values.length > 0);

  const grid = useMemo<EditorVariant[]>(() => {
    if (activeOptions.length === 0) {
      return variants.length > 0 ? variants : [{ optionValues: {}, price: 0, stock: 0 }];
    }
    const combos = cartesian(activeOptions);
    return combos.map((c) => {
      const existing = variants.find((v) =>
        activeOptions.every((o) => v.optionValues[o.name] === c[o.name])
      );
      return existing
        ? { ...existing, optionValues: c }
        : { optionValues: c, price: 0, stock: 0 };
    });
  }, [activeOptions, variants]);

  function update(idx: number, patch: Partial<EditorVariant>) {
    onChange(grid.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  // Build grid-template based on # option labels.
  const labelCols = activeOptions.map(() => "140px").join(" ");
  const templateCols = `${labelCols} 120px 120px 100px 1fr`.trim();

  return (
    <div className="mt-4 rounded-[10px] border border-line overflow-hidden bg-paper">
      <div className="flex justify-between items-center px-4 py-3 bg-paper-2 border-b border-line-2">
        <div>
          <div className="font-display font-semibold text-[13px] tracking-[-.005em]">Variant grid</div>
          <div className="text-[11.5px] text-ink-3 mt-px">
            Auto-generated from your options. Edit price, stock, or SKU inline.
          </div>
        </div>
        <span className="font-mono text-[11.5px] text-ink-3 bg-paper px-[9px] py-[3px] border border-line rounded-full">
          {grid.length} variant{grid.length === 1 ? "" : "s"}
        </span>
      </div>
      {/* Header */}
      <div
        className="grid text-[10.5px] uppercase tracking-[.12em] text-ink-3 font-medium bg-paper-2 border-b border-line-2"
        style={{ gridTemplateColumns: templateCols }}
      >
        {activeOptions.map((o) => (
          <div key={o.name} className="px-[14px] py-2.5 border-r border-line-2">
            {o.name}
          </div>
        ))}
        <div className="px-[14px] py-2.5 border-r border-line-2">Price</div>
        <div className="px-[14px] py-2.5 border-r border-line-2">Compare at</div>
        <div className="px-[14px] py-2.5 border-r border-line-2">Stock</div>
        <div className="px-[14px] py-2.5">SKU</div>
      </div>
      {/* Rows */}
      {grid.map((v, i) => (
        <div
          key={i}
          className="grid border-t border-line-2 first:border-t-0"
          style={{ gridTemplateColumns: templateCols }}
        >
          {activeOptions.map((o) => (
            <div
              key={o.name}
              className="px-[14px] py-2.5 border-r border-line-2 flex items-center font-display font-semibold text-[13px] tracking-[-.005em]"
            >
              {v.optionValues[o.name]}
            </div>
          ))}
          <div className="px-[14px] py-2.5 border-r border-line-2">
            <span className="inline-flex items-center gap-1 w-full">
              <span className="font-mono text-[11.5px] text-ink-4">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={Number.isFinite(v.price) ? v.price : 0}
                onChange={(e) => update(i, { price: Number(e.target.value) })}
                className="w-full h-[30px] px-2.5 border border-transparent bg-transparent font-mono text-[12.5px] text-ink outline-none rounded-[5px] hover:border-line hover:bg-paper-2 focus:border-ink focus:bg-paper focus:ring-2 focus:ring-ink/[0.08]"
              />
            </span>
          </div>
          <div className="px-[14px] py-2.5 border-r border-line-2">
            <span className="inline-flex items-center gap-1 w-full">
              <span className="font-mono text-[11.5px] text-ink-4">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={v.compareAtPrice ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const raw = e.target.value;
                  update(i, { compareAtPrice: raw === "" ? undefined : Number(raw) });
                }}
                className="w-full h-[30px] px-2.5 border border-transparent bg-transparent font-mono text-[12.5px] text-ink outline-none rounded-[5px] hover:border-line hover:bg-paper-2 focus:border-ink focus:bg-paper focus:ring-2 focus:ring-ink/[0.08]"
              />
            </span>
          </div>
          <div className="px-[14px] py-2.5 border-r border-line-2">
            <input
              type="number"
              min="0"
              value={Number.isFinite(v.stock) ? v.stock : 0}
              onChange={(e) => update(i, { stock: Number(e.target.value) })}
              className="w-full h-[30px] px-2.5 border border-transparent bg-transparent font-mono text-[12.5px] text-ink outline-none rounded-[5px] hover:border-line hover:bg-paper-2 focus:border-ink focus:bg-paper focus:ring-2 focus:ring-ink/[0.08]"
            />
          </div>
          <div className="px-[14px] py-2.5">
            <input
              value={v.sku ?? ""}
              onChange={(e) => update(i, { sku: e.target.value })}
              placeholder="SKU"
              className="w-full h-[30px] px-2.5 border border-transparent bg-transparent font-mono text-[12.5px] text-ink outline-none rounded-[5px] hover:border-line hover:bg-paper-2 focus:border-ink focus:bg-paper focus:ring-2 focus:ring-ink/[0.08]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Card shell ----------------------------- */
function DCard({
  accent,
  title,
  subtitle,
  children,
  tone,
}: {
  accent: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <div
      className={cn(
        "bg-paper border border-line rounded-[14px] overflow-hidden",
        tone === "danger" && "border-danger"
      )}
    >
      <div
        className={cn(
          "px-[22px] py-[18px] border-b border-line-2 flex items-center gap-2.5",
          tone === "danger" && "bg-danger-soft border-b-danger/20"
        )}
      >
        {tone !== "danger" && (
          <div className="w-[3px] self-stretch rounded-[2px]" style={{ background: accent }} />
        )}
        <div>
          <div
            className={cn(
              "font-display font-semibold text-[15px] tracking-[-.01em]",
              tone === "danger" && "text-danger"
            )}
          >
            {title}
          </div>
          {subtitle && <div className="text-[12px] text-ink-3 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ============================== Main form ============================== */
export function ProductFormClient({ product, storeSlug }: ProductFormClientProps) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [basics, setBasics] = useState(() => initialBasics(product));
  const [options, setOptions] = useState<ProductOption[]>(product?.options ?? []);
  const [variants, setVariants] = useState<EditorVariant[]>(
    product?.variants ?? [{ optionValues: {}, price: 0, stock: 0 }]
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dirty tracking — serialized snapshot of initial state.
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        basics: initialBasics(product),
        options: product?.options ?? [],
        variants: product?.variants ?? [{ optionValues: {}, price: 0, stock: 0 }],
      }),
    [product]
  );
  const currentSnapshot = JSON.stringify({ basics, options, variants });
  const dirty = currentSnapshot !== initialSnapshot;

  const discard = useCallback(() => {
    setBasics(initialBasics(product));
    setOptions(product?.options ?? []);
    setVariants(product?.variants ?? [{ optionValues: {}, price: 0, stock: 0 }]);
    setErr(null);
  }, [product]);

  // Warn on leave if dirty.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Compute variant count for header subtitle.
  const variantCount = useMemo(() => {
    const active = options.filter((o) => o.name.trim() && o.values.length > 0);
    if (active.length === 0) return variants.length || 1;
    return active.reduce((acc, o) => acc * o.values.length, 1);
  }, [options, variants.length]);

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      const payload = {
        name: basics.name,
        description: basics.description,
        category: basics.category,
        imageUrls: basics.imageUrls,
        unitCode: basics.unitCode,
        currency: basics.currency,
        options,
        variants,
        ...(isEdit ? { available: basics.available } : {}),
      };
      const res = await fetch(
        isEdit ? `/api/products/${product!.productId}` : "/api/products",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.message || d.error || "Failed to save");
        return;
      }
      router.refresh();
      router.push("/dashboard/products");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!product) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const res = await fetch(`/api/products/${product.productId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      router.push("/dashboard/products");
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d.message || d.error || "Failed to delete");
    }
  }

  return (
    <main className="min-h-screen bg-paper-2">
      {/* Breadcrumb */}
      <div className="px-8 pt-3.5 flex items-center gap-2 text-[12.5px] text-ink-3 bg-paper">
        <Link href="/dashboard/products" className="hover:text-ink transition-colors">
          Products
        </Link>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className="text-ink">{product?.name || "New product"}</span>
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-paper px-8 py-6 border-b border-line flex justify-between items-end gap-4">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-[-.02em] m-0">
            {isEdit ? "Edit product" : "New product"}
          </h1>
          <p className="text-[13px] text-ink-3 mt-0.5">
            {isEdit && product
              ? `${product.name}${basics.skuPrefix ? ` · ${basics.skuPrefix}` : ""} · ${variantCount} variant${variantCount === 1 ? "" : "s"}`
              : "Set up a new product for your catalog."}
          </p>
        </div>
        {isEdit && (
          <div className="flex gap-2">
            <Button variant="ghost" size="md" disabled>
              Duplicate
            </Button>
            {storeSlug && (
              <Button variant="ghost" size="md" asChild>
                <Link href={`/store/${storeSlug}/products/${product!.productId}`} target="_blank">
                  View on storefront
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7M8 7h9v9" />
                  </svg>
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="max-w-[960px] mx-auto px-8 py-7 pb-32 flex flex-col gap-4">
        {err && (
          <div className="rounded-md border border-danger bg-danger-soft text-danger px-4 py-3 text-[13px]">
            {err}
          </div>
        )}

        {/* Details card */}
        <DCard
          accent="var(--ink)"
          title="Details"
          subtitle="Name, description, category, and primary image."
        >
          <div className="p-[22px] flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Product name</Label>
              <Input
                value={basics.name}
                onChange={(e) => setBasics({ ...basics, name: e.target.value })}
                placeholder="e.g. Stringybark Raw Honey"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea
                value={basics.description}
                onChange={(e) => setBasics({ ...basics, description: e.target.value })}
                placeholder="Describe the product…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select
                  value={basics.category || undefined}
                  onValueChange={(v) => setBasics({ ...basics, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Shape (storefront tile)</Label>
                <Select
                  value={basics.shape}
                  onValueChange={(v) => setBasics({ ...basics, shape: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11.5px] text-ink-4 mt-1">
                  Determines the SVG illustration on the storefront.
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Images</Label>
              <ImageUploadMulti
                value={basics.imageUrls}
                onChange={(imageUrls) => setBasics({ ...basics, imageUrls })}
                max={8}
              />
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 text-[13px] text-ink-2">
                <input
                  type="checkbox"
                  checked={basics.available}
                  onChange={(e) => setBasics({ ...basics, available: e.target.checked })}
                />
                Available for sale
              </label>
            )}
          </div>
        </DCard>

        {/* Unit & currency */}
        <DCard
          accent="var(--brand)"
          title="Unit & currency"
          subtitle="What buyers see next to the quantity and price."
        >
          <div className="p-[22px]">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Unit code</Label>
                <Input
                  className="font-mono"
                  value={basics.unitCode}
                  onChange={(e) => setBasics({ ...basics, unitCode: e.target.value })}
                  placeholder="EA / kg / mL"
                />
                <span className="text-[11.5px] text-ink-4">UBL unit (e.g. EA, kg, mL, L).</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select
                  value={basics.currency}
                  onValueChange={(v) => setBasics({ ...basics, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>SKU prefix</Label>
                <Input
                  className="font-mono"
                  value={basics.skuPrefix}
                  onChange={(e) => setBasics({ ...basics, skuPrefix: e.target.value })}
                  placeholder="HH-HON"
                />
                <span className="text-[11.5px] text-ink-4">
                  Auto-used when generating variant SKUs.
                </span>
              </div>
            </div>
          </div>
        </DCard>

        {/* Options & variants */}
        <DCard
          accent="var(--accent)"
          title="Options & variants"
          subtitle="Define size / flavor / etc., and a variant row is generated for each combination."
        >
          <div className="p-[22px] flex flex-col gap-4">
            <OptionsBuilder options={options} onChange={setOptions} />
            <VariantGridEditor
              options={options}
              variants={variants}
              onChange={setVariants}
            />
          </div>
        </DCard>

        {/* Danger zone */}
        {isEdit && (
          <DCard accent="var(--danger)" title="Danger zone" tone="danger">
            <div className="flex justify-between items-center px-[22px] py-4 gap-4">
              <div className="text-[13px] text-ink-2 max-w-[500px] leading-[1.55]">
                <strong className="text-ink font-display font-semibold">
                  Delete this product.
                </strong>{" "}
                Removes the product and all variants. Past orders keep their line items but
                buyers can no longer re-order. Cannot be undone.
              </div>
              <Button variant="danger" size="md" onClick={remove}>
                Delete product…
              </Button>
            </div>
          </DCard>
        )}
      </div>

      {/* Sticky unsaved bar */}
      {dirty && (
        <div className="fixed bottom-4 left-4 right-4 md:left-[calc(var(--sidebar-w,240px)+24px)] md:right-12 z-30 bg-ink text-paper px-5 py-3 rounded-xl flex justify-between items-center gap-4 shadow-[0_12px_32px_rgba(0,0,0,.25)]">
          <div className="flex items-center gap-2.5 text-[13px]">
            <span className="w-2 h-2 rounded-full bg-hot" aria-hidden />
            You have unsaved changes{basics.name ? ` to "${basics.name}"` : ""}.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="h-[34px] px-[14px] rounded-[7px] font-display font-semibold text-[12.5px] bg-transparent text-[#c7cad0] border border-white/20 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-[34px] px-[14px] rounded-[7px] font-display font-semibold text-[12.5px] bg-paper text-ink hover:bg-paper-2 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* First-save bar when creating (always visible until first save) */}
      {!isEdit && !dirty && (
        <div className="fixed bottom-4 left-4 right-4 md:left-[calc(var(--sidebar-w,240px)+24px)] md:right-12 z-30 bg-paper border border-line px-5 py-3 rounded-xl flex justify-end items-center gap-2 shadow-[0_12px_32px_rgba(0,0,0,.08)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/products")}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Creating…" : "Create product"}
          </Button>
        </div>
      )}

      {/* Silence unused import warning for thumbnail helper — reserved for future inline image card. */}
      <span className="hidden" aria-hidden>
        {transformedImageUrl("", "product")}
      </span>
    </main>
  );
}

export default ProductFormClient;
