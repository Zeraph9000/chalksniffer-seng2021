"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { ReplaceCartModal } from "@/components/replace-cart-modal";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant, Store } from "@/lib/types";
import { transformedImageUrl } from "@/lib/image-url";

const LOW_STOCK_THRESHOLD = 5;

function formatMoney(n: number, currency = "USD") {
  // Try Intl first; fall back to $N.NN if currency isn't understood.
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function variantLabelFor(product: Product, variant: ProductVariant | null): string {
  if (product.options.length === 0) return product.name;
  if (!variant) return "Select options";
  return (
    product.options
      .map((o) => variant.optionValues[o.name])
      .filter(Boolean)
      .join(" / ") || "Select options"
  );
}

export function ProductDetailClient({
  store,
  product,
  storeSlug,
  storeMonogram,
}: {
  store: Store;
  product: Product;
  storeSlug: string;
  storeMonogram: string;
}) {
  const router = useRouter();
  const cart = useCart();

  // A PDP has at least one variant when rendered. We default to the first
  // in-stock variant; falling back to the first variant even if OOS so we
  // still show the OOS state rather than a blank page.
  const defaultVariant =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0] ?? null;
  const [variant, setVariant] = useState<ProductVariant | null>(defaultVariant);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; incoming: string }>({
    open: false,
    incoming: "",
  });

  const variantLabel = variantLabelFor(product, variant);

  // Overall stock signal across all variants — used for shop eyebrow status dot.
  const stockSignal: "open" | "low" | "oos" = useMemo(() => {
    if (product.variants.length === 0) return "oos";
    const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
    if (totalStock === 0) return "oos";
    const anyLow = product.variants.some((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD);
    return anyLow ? "low" : "open";
  }, [product.variants]);

  // Gallery images — product.imageUrls plus selected variant image if it adds new content.
  const galleryImages = useMemo(() => {
    const list = [...(product.imageUrls ?? [])];
    if (variant?.imageUrl && !list.includes(variant.imageUrl)) {
      list.unshift(variant.imageUrl);
    }
    return list.slice(0, 3);
  }, [product.imageUrls, variant?.imageUrl]);

  const mainImageSrc = galleryImages[activeImageIndex] ?? galleryImages[0] ?? "";

  const handleSelectVariant = useCallback((v: ProductVariant) => {
    if (v.stock === 0) return;
    setVariant(v);
    setQty(1);
  }, []);

  const onSaleCompareAt = variant?.compareAtPrice && variant.compareAtPrice > variant.price
    ? variant.compareAtPrice
    : null;
  const savePct = onSaleCompareAt && variant
    ? Math.round(((onSaleCompareAt - variant.price) / onSaleCompareAt) * 100)
    : null;

  const currentStock = variant?.stock ?? 0;
  const stockState: "ok" | "low" | "oos" =
    currentStock === 0 ? "oos" : currentStock <= LOW_STOCK_THRESHOLD ? "low" : "ok";
  const stockLabel =
    stockState === "oos"
      ? "Sold out"
      : stockState === "low"
        ? `Only ${currentStock} left`
        : `${currentStock} in stock`;

  const storeNotAccepting = store.status !== "active";
  const addDisabled = !variant || currentStock === 0 || storeNotAccepting;

  const addButtonCopy = (() => {
    if (storeNotAccepting) return "Store not accepting orders";
    if (!variant) return "Select options";
    if (currentStock === 0) return "Currently unavailable";
    return "Add to cart";
  })();

  function doAdd() {
    if (!variant || addDisabled) return;
    const res = cart.addItem({
      productId: product.productId,
      variantId: variant.variantId,
      name: product.name,
      variantLabel,
      imageUrl: variant.imageUrl ?? product.imageUrls[0],
      unitCode: product.unitCode,
      unitPriceSnapshot: variant.price,
      currency: product.currency,
      quantity: qty,
      stock: variant.stock,
      storeId: store.storeId,
      storeSlug,
      storeName: store.storeName,
    });
    if (!res.ok && res.reason === "DIFFERENT_STORE") {
      setModal({ open: true, incoming: store.storeName });
    } else {
      router.push("/cart");
    }
  }

  function replaceCart() {
    if (!variant) return;
    cart.forceReplaceWith({
      productId: product.productId,
      variantId: variant.variantId,
      name: product.name,
      variantLabel,
      imageUrl: variant.imageUrl ?? product.imageUrls[0],
      unitCode: product.unitCode,
      unitPriceSnapshot: variant.price,
      currency: product.currency,
      quantity: qty,
      stock: variant.stock,
      storeId: store.storeId,
      storeSlug,
      storeName: store.storeName,
    });
    setModal({ open: false, incoming: "" });
    router.push("/cart");
  }

  const currency = product.currency || "USD";

  // Use the first product option as the primary variant axis for the pill
  // group (matches the mockup: "Size" label + pills). If there's more than
  // one option we still render only the first axis for the pill row — further
  // axes could be surfaced in a follow-up; keeping this tight per spec.
  const primaryOption = product.options[0] ?? null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 items-start">
        {/* Gallery */}
        <div>
          <div className="aspect-square border border-line rounded-[12px] overflow-hidden bg-paper relative">
            {mainImageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={transformedImageUrl(mainImageSrc, "product")}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center bg-brand-soft text-brand-ink font-display font-bold text-[72px] tracking-[-.025em]">
                {product.name.trim().charAt(0).toUpperCase() || storeMonogram.charAt(0)}
              </div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="flex gap-2 mt-[10px]">
              {galleryImages.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  aria-label={`View ${i + 1}`}
                  onClick={() => setActiveImageIndex(i)}
                  className={cn(
                    "w-[72px] h-[72px] rounded-[8px] overflow-hidden bg-paper p-0 cursor-pointer",
                    activeImageIndex === i
                      ? "border-2 border-ink"
                      : "border border-line hover:border-ink-3"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={transformedImageUrl(src, "product")}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {/* Shop eyebrow */}
          <div className="text-[11.5px] uppercase tracking-[.12em] text-ink-3 mb-2 inline-flex items-center gap-2">
            <StatusDot status={stockSignal === "open" ? "open" : stockSignal === "low" ? "low" : "oos"} size={6} />
            <Link href={`/store/${storeSlug}`} className="text-ink-2 hover:text-ink transition-colors">
              {store.storeName.toUpperCase()}
            </Link>
            {product.category && (
              <>
                <span className="text-ink-4">·</span>
                <span>{product.category.toUpperCase()}</span>
              </>
            )}
          </div>

          {/* Product name */}
          <h1 className="font-display text-[34px] font-bold tracking-[-.028em] leading-[1.08] m-0 mb-[14px] text-ink">
            {product.name}
          </h1>

          {/* Price row */}
          <div className="flex items-baseline gap-[10px] mb-6">
            <span className="font-mono text-[26px] font-medium tracking-[-.015em]">
              {variant ? formatMoney(variant.price, currency) : ""}
            </span>
            {onSaleCompareAt && (
              <span className="font-mono text-[14px] text-ink-4 line-through">
                {formatMoney(onSaleCompareAt, currency)}
              </span>
            )}
            {savePct !== null && savePct > 0 && (
              <span className="font-sans text-[11.5px] px-2 py-[2px] rounded-[4px] bg-warn-bg text-warn font-medium">
                {savePct}% off
              </span>
            )}
          </div>

          {/* VariantSelector */}
          {primaryOption && (
            <div className="mb-5">
              <div className="flex justify-between items-center mb-[10px]">
                <span className="font-sans text-[11.5px] font-medium uppercase tracking-[.1em] text-ink-3">
                  {primaryOption.name}
                </span>
                <span className="text-[12px] text-ink-2">
                  {variant?.optionValues[primaryOption.name] ?? "Select"}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {primaryOption.values.map((val) => {
                  // Find the variant matching this primary option value (first match wins).
                  const match = product.variants.find(
                    (v) => v.optionValues[primaryOption.name] === val
                  );
                  const isOos = !match || match.stock === 0;
                  const isOn =
                    !!variant && variant.optionValues[primaryOption.name] === val && !isOos;
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={isOos}
                      onClick={() => match && handleSelectVariant(match)}
                      className={cn(
                        "min-w-[76px] px-[14px] py-[9px] rounded-[8px] font-sans text-[13px] font-medium",
                        "flex flex-col items-start gap-[2px] transition-colors",
                        "border",
                        isOn
                          ? "border-ink bg-ink text-paper"
                          : isOos
                            ? "border-line bg-paper-2 text-ink-4 cursor-not-allowed line-through"
                            : "border-line bg-paper text-ink hover:border-ink-3"
                      )}
                    >
                      <span>{val}</span>
                      {match && (
                        <span
                          className={cn(
                            "font-mono text-[10.5px] font-normal",
                            isOn ? "text-[#c5c8cc]" : "text-ink-3"
                          )}
                        >
                          {formatMoney(match.price, currency)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + Stock indicator */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-[10px]">
              <span className="font-sans text-[11.5px] font-medium uppercase tracking-[.1em] text-ink-3">
                Quantity
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-2 text-[12.5px]",
                  stockState === "ok" && "text-ink-2",
                  stockState === "low" && "text-warn",
                  stockState === "oos" && "text-[color:#741818]"
                )}
              >
                <StatusDot
                  status={stockState === "ok" ? "open" : stockState === "low" ? "low" : "oos"}
                  size={8}
                />
                {stockLabel}
              </span>
            </div>
            <div className="inline-flex items-center border border-line rounded-[8px] h-[44px]">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1 || currentStock === 0}
                aria-label="Decrease quantity"
                className="w-[44px] h-[42px] bg-transparent grid place-items-center text-ink-2 hover:enabled:text-ink disabled:text-ink-4 disabled:cursor-not-allowed"
              >
                <Minus className="h-[16px] w-[16px]" />
              </button>
              <span className="min-w-[30px] text-center font-mono text-[14px] font-medium">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(currentStock, q + 1))}
                disabled={qty >= currentStock || currentStock === 0}
                aria-label="Increase quantity"
                className="w-[44px] h-[42px] bg-transparent grid place-items-center text-ink-2 hover:enabled:text-ink disabled:text-ink-4 disabled:cursor-not-allowed"
              >
                <Plus className="h-[16px] w-[16px]" />
              </button>
            </div>
          </div>

          {/* AddToCartButton */}
          <button
            type="button"
            disabled={addDisabled}
            onClick={doAdd}
            className={cn(
              "w-full h-[52px] px-5 rounded-[10px] mt-6",
              "font-display text-[15px] font-semibold tracking-[-.01em]",
              "inline-flex items-center justify-center gap-[10px] transition-colors",
              addDisabled
                ? "bg-ink-4 text-paper cursor-not-allowed"
                : "bg-ink text-paper hover:bg-black"
            )}
          >
            <ShoppingCart className="h-[18px] w-[18px]" />
            <span>{addButtonCopy}</span>
            {!addDisabled && variant && (
              <span className="font-mono font-medium opacity-85 before:content-['·'] before:mx-[10px] before:opacity-50">
                {formatMoney(variant.price * qty, currency)}
              </span>
            )}
          </button>
        </div>
      </div>

      <ReplaceCartModal
        open={modal.open}
        currentStore={cart.storeName ?? ""}
        newStore={modal.incoming}
        onCancel={() => setModal({ open: false, incoming: "" })}
        onReplace={replaceCart}
      />
    </>
  );
}
