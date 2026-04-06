"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorBanner } from "@/components/error-banner";
import { MATERIAL_CATEGORIES } from "@/lib/construction-data";
import { Product } from "@/lib/types";
import { Pencil, Trash2, Plus, X } from "lucide-react";

type ProductWithId = Product & { _id: string };

type FormState = {
  name: string;
  description: string;
  category: string;
  unitCode: string;
  unitPrice: string;
  stock: string;
  currency: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  category: MATERIAL_CATEGORIES[0].id,
  unitCode: MATERIAL_CATEGORIES[0].defaultUnit,
  unitPrice: "",
  stock: "",
  currency: "AUD",
};

function formatCurrency(price: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    minimumFractionDigits: 2,
  }).format(price);
}

export default function CataloguePage() {
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithId | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data);
    } catch {
      setError("Could not load your catalogue. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openAdd() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(product: ProductWithId) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      unitCode: product.unitCode,
      unitPrice: String(product.unitPrice),
      stock: String(product.stock),
      currency: product.currency,
    });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleCategoryChange(categoryId: string) {
    const cat = MATERIAL_CATEGORIES.find((c) => c.id === categoryId);
    setForm((prev) => ({
      ...prev,
      category: categoryId,
      unitCode: cat?.defaultUnit ?? prev.unitCode,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) { setFormError("Product name is required."); return; }
    if (!form.unitPrice || isNaN(Number(form.unitPrice)) || Number(form.unitPrice) < 0) {
      setFormError("A valid unit price is required."); return;
    }
    if (!form.stock || isNaN(Number(form.stock)) || Number(form.stock) < 0) {
      setFormError("A valid stock quantity is required."); return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        unitCode: form.unitCode,
        unitPrice: Number(form.unitPrice),
        stock: Number(form.stock),
        currency: form.currency || "AUD",
      };

      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save product");
      }

      closeModal();
      await loadProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product: ProductWithId) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/products/${product._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      await loadProducts();
    } catch {
      setError("Could not delete the product. Please try again.");
    }
  }

  if (loading) return <LoadingSpinner message="Loading catalogue..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Product Catalogue</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage the products you sell to contractors
          </p>
        </div>
        <button onClick={openAdd} className="btn-seller flex items-center gap-2">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* Table */}
      {products.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-semibold text-ink">No products yet</p>
            <p className="mt-1.5 text-sm text-ink-muted max-w-xs">
              Add your first product to start selling to contractors
            </p>
            <button onClick={openAdd} className="btn-seller mt-6 text-sm flex items-center gap-2">
              <Plus size={15} />
              Add Product
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface-overlay">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Category</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Unit Price</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Unit</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Stock</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const cat = MATERIAL_CATEGORIES.find((c) => c.id === product.category);
                return (
                  <tr key={String(product._id)} className="border-b border-surface-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-ink-faint mt-0.5 max-w-xs truncate">{product.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-ink-muted">{cat?.label ?? product.category}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {formatCurrency(product.unitPrice, product.currency)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-surface px-2 py-1 text-xs font-mono text-ink-muted">
                        {product.unitCode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-sm tabular-nums font-medium ${product.stock === 0 ? "text-red-600" : product.stock < 10 ? "text-amber-600" : "text-ink"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="btn-ghost px-2.5 py-1.5 text-xs flex items-center gap-1.5"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="btn-danger px-2.5 py-1.5 text-xs flex items-center gap-1.5"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border border-surface-border bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
              <h2 className="text-base font-bold text-ink">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button onClick={closeModal} className="text-ink-faint hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <ErrorBanner message={formError} onDismiss={() => setFormError("")} />
              )}

              <div>
                <label className="input-label">Product Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Portland Cement 20kg Bag"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="input-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional product description..."
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Category <span className="text-red-500">*</span></label>
                  <select
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="input"
                  >
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Unit Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.unitCode}
                    onChange={(e) => setForm((p) => ({ ...p, unitCode: e.target.value }))}
                    placeholder="e.g. EA, t, m³"
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Unit Price (AUD) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}
                    placeholder="0.00"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Stock Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    placeholder="0"
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-seller">
                  {submitting ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>,
      document.body)}
    </div>
  );
}
