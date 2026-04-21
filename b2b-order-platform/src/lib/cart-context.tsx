"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;         // e.g. "Red / M"
  imageUrl?: string;
  unitCode: string;
  unitPriceSnapshot: number;    // snapshot at add-to-cart time
  currency: string;
  quantity: number;
  stock: number;                // snapshot for client-side max qty
  storeId: string;
  storeName: string;
};

type CartContextType = {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  totalItems: number;
  addItem: (item: CartItem) => { ok: true } | { ok: false; reason: "DIFFERENT_STORE"; currentStoreName: string; incomingStoreName: string };
  forceReplaceWith: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "chalksniffer-cart";

type Persisted = { storeId: string | null; storeName: string | null; items: CartItem[] };

function isValidCartItem(x: unknown): x is CartItem {
  if (typeof x !== "object" || x === null) return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.productId === "string"
    && typeof c.variantId === "string"
    && typeof c.name === "string"
    && typeof c.variantLabel === "string"
    && typeof c.unitCode === "string"
    && typeof c.unitPriceSnapshot === "number"
    && typeof c.currency === "string"
    && typeof c.quantity === "number"
    && typeof c.stock === "number"
    && typeof c.storeId === "string"
    && typeof c.storeName === "string"
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<Persisted>;
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      const validItems = rawItems.filter(isValidCartItem);
      // If any items were dropped, we also drop the store binding —
      // partial carts shouldn't lock the user into a phantom store.
      if (validItems.length === 0) return;
      setStoreId(typeof parsed.storeId === "string" ? parsed.storeId : null);
      setStoreName(typeof parsed.storeName === "string" ? parsed.storeName : null);
      setItems(validItems);
    } catch {
      // stale/corrupt storage — ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ storeId, storeName, items }));
  }, [storeId, storeName, items]);

  const addItem: CartContextType["addItem"] = useCallback((item) => {
    if (storeId && item.storeId !== storeId) {
      return {
        ok: false,
        reason: "DIFFERENT_STORE",
        currentStoreName: storeName ?? "",
        incomingStoreName: item.storeName,
      };
    }
    if (!storeId) {
      setStoreId(item.storeId);
      setStoreName(item.storeName);
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId && i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId && i.variantId === item.variantId
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
            : i
        );
      }
      return [...prev, item];
    });
    return { ok: true };
  }, [storeId, storeName]);

  const forceReplaceWith = useCallback((item: CartItem) => {
    setStoreId(item.storeId);
    setStoreName(item.storeName);
    setItems([item]);
  }, []);

  const removeItem = useCallback((productId: string, variantId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => !(i.productId === productId && i.variantId === variantId));
      if (next.length === 0) {
        setStoreId(null);
        setStoreName(null);
      }
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setStoreId(null);
    setStoreName(null);
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ storeId, storeName, items, totalItems, addItem, forceReplaceWith, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
