"use client";

import { useEffect, useState, useMemo } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { useCart } from "@/lib/cart-context";
import { MATERIAL_CATEGORIES } from "@/lib/construction-data";
import { ShoppingCart, Check } from "lucide-react";

type ProductListing = {
  _id: string;
  sellerEmail: string;
  sellerName?: string;
  sellerCompanyName?: string;
  name: string;
  description: string;
  category: string;
  unitCode: string;
  unitPrice: number;
  currency: string;
  stock: number;
};

function formatCurrency(price: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    minimumFractionDigits: 2,
  }).format(price);
}

export default function CataloguePage() {
  const { addItem, items } = useCart();
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Applied filters
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCategories, setAppliedCategories] = useState<Set<string>>(new Set());
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");

  // Per-product quantity inputs
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Added feedback
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setProducts(data);
        const initial: Record<string, number> = {};
        for (const p of data) {
          initial[p._id] = 1;
        }
        setQuantities(initial);
      } catch {
        setError("Could not load the marketplace. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedCategories(new Set(selectedCategories));
    setAppliedMinPrice(minPrice);
    setAppliedMaxPrice(maxPrice);
  }

  function handleClear() {
    setSearch("");
    setSelectedCategories(new Set());
    setMinPrice("");
    setMaxPrice("");
    setAppliedSearch("");
    setAppliedCategories(new Set());
    setAppliedMinPrice("");
    setAppliedMaxPrice("");
  }

  const filtered = useMemo(() => {
    let result = products;
    if (appliedSearch) {
      const q = appliedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.sellerCompanyName || "").toLowerCase().includes(q)
      );
    }
    if (appliedCategories.size > 0) {
      result = result.filter((p) => appliedCategories.has(p.category));
    }
    if (appliedMinPrice) result = result.filter((p) => p.unitPrice >= Number(appliedMinPrice));
    if (appliedMaxPrice) result = result.filter((p) => p.unitPrice <= Number(appliedMaxPrice));
    return result;
  }, [products, appliedSearch, appliedCategories, appliedMinPrice, appliedMaxPrice]);

  function handleAddToCart(product: ProductListing) {
    const qty = quantities[product._id] ?? 1;
    addItem({
      productId: product._id,
      name: product.name,
      unitCode: product.unitCode,
      unitPrice: product.unitPrice,
      currency: product.currency,
      quantity: qty,
      sellerEmail: product.sellerEmail,
      sellerName: product.sellerCompanyName || product.sellerEmail,
      stock: product.stock,
    });
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(product._id);
      return next;
    });
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }, 1500);
  }

  if (loading) return <LoadingSpinner message="Loading marketplace..." />;

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Catalogue</h1>
          <p className="mt-1 text-sm text-ink-muted">Browse and order construction materials from suppliers</p>
        </div>
        <a href="/cart" className="btn-primary flex items-center gap-2 relative">
          <ShoppingCart size={16} />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-accent-buyer border border-accent-buyer">
              {cartCount}
            </span>
          )}
        </a>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div className="card overflow-hidden flex">
        {/* Sidebar Filters */}
        <aside className="w-56 shrink-0 space-y-5 border-r border-surface-border p-4">
          <h2 className="text-sm font-bold text-ink">Filters</h2>

          <div>
            <label className="input-label">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              placeholder="Search products..."
              className="input mt-1"
            />
          </div>

          <div>
            <label className="input-label">Category</label>
            <div className="mt-1.5 space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {MATERIAL_CATEGORIES.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="rounded border-surface-border"
                  />
                  <span className="text-sm text-ink">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">Price Range (AUD)</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="input flex-1"
              />
              <span className="text-xs text-ink-faint">—</span>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="input flex-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleApply} className="btn-primary flex-1 text-sm">Apply</button>
            <button onClick={handleClear} className="btn-ghost flex-1 text-sm">Clear</button>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1 p-4">
          {filtered.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your filters or search query"
            />
          ) : (
            <>
              <p className="text-xs text-ink-faint mb-4">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((product) => {
                  const cat = MATERIAL_CATEGORIES.find((c) => c.id === product.category);
                  const qty = quantities[product._id] ?? 1;
                  const isAdded = addedIds.has(product._id);
                  const outOfStock = product.stock === 0;

                  return (
                    <div key={product._id} className="rounded-lg border border-surface-border bg-white p-4 space-y-3 flex flex-col">
                      {/* Product info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-ink leading-snug">{product.name}</h3>
                          {outOfStock && (
                            <span className="shrink-0 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-600">
                              Out of stock
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          {product.sellerCompanyName || product.sellerEmail}
                        </p>
                        {cat && (
                          <span className="mt-1.5 inline-block rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-muted border border-surface-border">
                            {cat.label}
                          </span>
                        )}
                        {product.description && (
                          <p className="mt-2 text-xs text-ink-faint leading-relaxed line-clamp-2">{product.description}</p>
                        )}
                      </div>

                      {/* Price & stock */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-base font-bold text-ink tabular-nums">
                            {formatCurrency(product.unitPrice, product.currency)}
                          </span>
                          <span className="text-xs text-ink-faint ml-1">/ {product.unitCode}</span>
                        </div>
                        <span className="text-xs text-ink-muted">{product.stock} in stock</span>
                      </div>

                      {/* Add to cart */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={product.stock}
                          value={qty}
                          disabled={outOfStock}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(Number(e.target.value), product.stock));
                            setQuantities((prev) => ({ ...prev, [product._id]: val }));
                          }}
                          className="input w-20 text-center"
                        />
                        <button
                          disabled={outOfStock || isAdded}
                          onClick={() => handleAddToCart(product)}
                          className={`btn flex-1 text-sm ${isAdded ? "bg-emerald-600 text-white" : "btn-primary"}`}
                        >
                          {isAdded ? (
                            <span className="flex items-center gap-1.5 justify-center">
                              <Check size={14} /> Added
                            </span>
                          ) : (
                            "Add to Cart"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
