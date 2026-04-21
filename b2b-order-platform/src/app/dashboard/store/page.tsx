"use client";
import { useEffect, useState } from "react";
import type { Store } from "@/lib/types";

export default function StoreEditor() {
  const [store, setStore] = useState<Partial<Store>>({ status: "active" });
  const [existing, setExisting] = useState<Store | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stores/me").then(async (r) => {
      if (r.ok) {
        const s = (await r.json()) as Store;
        setExisting(s);
        setStore(s);
      }
    });
  }, []);

  useEffect(() => {
    if (!existing) return setShareUrl(null);
    if (typeof window === "undefined") return;
    setShareUrl(`${window.location.origin}/store/${existing.storeId}`);
  }, [existing]);

  async function save() {
    const url = existing ? `/api/stores/${existing.storeId}` : `/api/stores`;
    const method = existing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
    });
    if (res.ok) {
      setMsg("Saved.");
      const s = (await res.json()) as Store;
      setExisting(s);
    } else {
      const d = await res.json();
      setMsg(d.message || d.error);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">{existing ? "Edit store" : "Create store"}</h1>
      {shareUrl && (
        <div className="mb-6 p-3 bg-blue-50 rounded">
          Your storefront URL: <code>{shareUrl}</code>{" "}
          <button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)} className="underline text-sm">
            Copy
          </button>
        </div>
      )}
      <div className="space-y-3">
        <input placeholder="Store name" value={store.storeName ?? ""} onChange={(e) => setStore({ ...store, storeName: e.target.value })} className="w-full border rounded px-3 py-2" />
        <textarea placeholder="Description" value={store.description ?? ""} onChange={(e) => setStore({ ...store, description: e.target.value })} className="w-full border rounded px-3 py-2" />
        <input placeholder="Category (e.g. bakery)" value={store.category ?? ""} onChange={(e) => setStore({ ...store, category: e.target.value })} className="w-full border rounded px-3 py-2" />
        <input placeholder="Location" value={store.location ?? ""} onChange={(e) => setStore({ ...store, location: e.target.value })} className="w-full border rounded px-3 py-2" />
        <input placeholder="Logo URL" value={store.logoUrl ?? ""} onChange={(e) => setStore({ ...store, logoUrl: e.target.value })} className="w-full border rounded px-3 py-2" />
        <input placeholder="Banner URL" value={store.bannerUrl ?? ""} onChange={(e) => setStore({ ...store, bannerUrl: e.target.value })} className="w-full border rounded px-3 py-2" />
        <select
          value={store.status ?? "active"}
          onChange={(e) => setStore({ ...store, status: e.target.value as Store["status"] })}
          className="w-full border rounded px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <button type="button" onClick={save} className="mt-4 px-6 py-2 bg-black text-white rounded">Save</button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </main>
  );
}
