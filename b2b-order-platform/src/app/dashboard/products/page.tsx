import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store, Product } from "@/lib/types";
import { transformedImageUrl } from "@/lib/image-url";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StockFilter = "all" | "in" | "low" | "out";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function skuish(p: Product, i: number) {
  // Try to surface a first variant SKU; fall back to a derived short code.
  const first = p.variants.find((v) => v.sku)?.sku;
  if (first) return first;
  const head = p.name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .join("-");
  return `${head || "PRD"}-${String(i + 1).padStart(3, "0")}`;
}

export default async function DashboardProducts({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; stock?: string; q?: string }>;
}) {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const params = (await searchParams) ?? {};
  const categoryFilter = params.category ?? "all";
  const stockFilter = (params.stock ?? "all") as StockFilter;
  const query = (params.q ?? "").trim().toLowerCase();

  const client = await clientPromise;
  const db = client.db();
  const store = await db
    .collection<Store>("stores")
    .findOne({ userId: session.userId });

  if (!store) {
    return (
      <main className="min-h-screen bg-paper-2">
        <div className="sticky top-0 z-20 bg-paper px-8 py-6 border-b border-line">
          <h1 className="font-display text-[24px] font-semibold tracking-[-.02em] m-0">
            Products
          </h1>
          <p className="text-[13px] text-ink-3 mt-0.5">Your store catalog appears here.</p>
        </div>
        <div className="px-8 py-7">
          <div className="bg-paper border border-line rounded-[14px] p-8 text-[13px] text-ink-2">
            You need a store first.{" "}
            <Link href="/dashboard/store" className="underline font-medium">
              Create one
            </Link>
            .
          </div>
        </div>
      </main>
    );
  }

  const allProducts = await db
    .collection<Product>("products")
    .find({ storeId: store.storeId })
    .sort({ createdAt: -1 })
    .toArray();

  const totalCount = allProducts.length;
  const categories = Array.from(
    new Set(allProducts.map((p) => p.category).filter(Boolean))
  ).sort();

  const filtered = allProducts.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;

    const totalStock = p.variants.reduce((s, v) => s + (v.stock || 0), 0);
    if (stockFilter === "in" && totalStock < 5) return false;
    if (stockFilter === "low" && !(totalStock > 0 && totalStock < 5)) return false;
    if (stockFilter === "out" && totalStock !== 0) return false;

    if (query) {
      const hay = [
        p.name,
        p.category,
        ...(p.variants.map((v) => v.sku).filter(Boolean) as string[]),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-paper-2">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-paper px-8 py-6 border-b border-line flex justify-between items-end gap-4">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-[-.02em] m-0">
            Products
          </h1>
          <p className="text-[13px] text-ink-3 mt-0.5">
            {totalCount} product{totalCount === 1 ? "" : "s"} — everything in your store
            catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="md" disabled title="Export coming soon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Export CSV
          </Button>
          <Button variant="primary" size="md" asChild>
            <Link href="/dashboard/products/new">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New product
            </Link>
          </Button>
        </div>
      </div>

      <div className="px-8 py-7 flex flex-col gap-[18px]">
        {/* Filter bar */}
        <form
          method="GET"
          className="flex gap-2.5 items-center flex-wrap"
        >
          {/* Category */}
          <label className="h-9 inline-flex items-center gap-2 px-3 border border-line rounded-lg bg-paper text-[13px] text-ink-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="border-0 bg-transparent font-sans text-[13px] text-ink outline-none cursor-pointer"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* Stock */}
          <label className="h-9 inline-flex items-center gap-2 px-3 border border-line rounded-lg bg-paper text-[13px] text-ink-2">
            <select
              name="stock"
              defaultValue={stockFilter}
              className="border-0 bg-transparent font-sans text-[13px] text-ink outline-none cursor-pointer"
            >
              <option value="all">All stock</option>
              <option value="in">In stock</option>
              <option value="low">Low (&lt; 5)</option>
              <option value="out">Out of stock</option>
            </select>
          </label>

          {/* Search */}
          <div className="flex-1 max-w-[320px] h-9 flex items-center gap-2 px-3 border border-line rounded-lg bg-paper text-ink-4">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search products by name or SKU…"
              className="flex-1 border-0 bg-transparent outline-none text-[13px] text-ink font-sans"
            />
          </div>

          <button type="submit" className="sr-only">
            Apply filters
          </button>

          <span className="font-mono text-[12px] text-ink-3 ml-auto">
            {filtered.length} of {totalCount}
          </span>
        </form>

        {/* Table */}
        <div className="border border-line rounded-[12px] overflow-hidden bg-paper">
          <div className="grid grid-cols-[52px_1.6fr_1fr_.8fr_.9fr_.7fr_30px] gap-4 px-[18px] py-3 text-[10.5px] uppercase tracking-[.12em] text-ink-3 bg-paper-2 border-b border-line-2 font-medium">
            <div />
            <div>Name</div>
            <div>Category</div>
            <div>Variants</div>
            <div>Price</div>
            <div className="text-right">Stock</div>
            <div />
          </div>

          {filtered.length === 0 && (
            <div className="px-[18px] py-10 text-center text-[13px] text-ink-3">
              {totalCount === 0 ? (
                <>
                  No products yet.{" "}
                  <Link
                    href="/dashboard/products/new"
                    className="underline font-medium text-ink"
                  >
                    Create your first product
                  </Link>
                  .
                </>
              ) : (
                <>No products match your filters.</>
              )}
            </div>
          )}

          {filtered.map((p, i) => {
            const prices = p.variants.map((v) => v.price);
            const priceMin = prices.length ? Math.min(...prices) : 0;
            const priceMax = prices.length ? Math.max(...prices) : 0;
            const totalStock = p.variants.reduce((s, v) => s + (v.stock || 0), 0);
            const stockTone =
              totalStock === 0 ? "oos" : totalStock < 5 ? "low" : "ok";
            const thumbUrl = p.imageUrls?.[0]
              ? transformedImageUrl(p.imageUrls[0], "product")
              : null;

            return (
              <Link
                key={p.productId}
                href={`/dashboard/products/${p.productId}/edit`}
                className="grid grid-cols-[52px_1.6fr_1fr_.8fr_.9fr_.7fr_30px] gap-4 px-[18px] py-3 items-center border-t border-line-2 first:border-t-0 hover:bg-paper-2 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-brand-soft grid place-items-center text-brand-ink font-display font-bold text-[13px]">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials(p.name) || "P"}</span>
                  )}
                </div>
                <div>
                  <div className="text-[13px] font-medium tracking-[-.005em] text-ink">
                    {p.name}
                    {!p.available && (
                      <span className="ml-2 text-[11px] text-ink-3 font-normal">
                        (archived)
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5 font-mono">
                    {skuish(p, i)}
                  </div>
                </div>
                <div className="text-[12.5px] text-ink-2 inline-flex items-center gap-1.5">
                  <span
                    className="w-[7px] h-[7px] rounded-full bg-brand"
                    aria-hidden
                  />
                  {p.category}
                </div>
                <div className="text-[12px] text-ink-3">
                  {p.variants.length <= 1
                    ? "Single"
                    : `${p.variants.length} ${p.options?.[0]?.name?.toLowerCase() || "variant"}${p.variants.length === 1 ? "" : "s"}`}
                </div>
                <div className="font-mono text-[13px] font-medium text-ink">
                  ${priceMin.toFixed(0)}
                  {priceMax > priceMin && (
                    <span className="text-ink-4">–${priceMax.toFixed(0)}</span>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 font-mono text-[12.5px] font-medium",
                      stockTone === "ok" &&
                        "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent",
                      stockTone === "low" &&
                        "text-warn before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-warn",
                      stockTone === "oos" &&
                        "text-[#741818] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#741818]"
                    )}
                  >
                    {stockTone === "oos" ? "Out" : totalStock}
                  </span>
                </div>
                <div className="text-ink-4 text-right text-sm">↗</div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
