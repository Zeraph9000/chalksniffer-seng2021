import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store } from "@/lib/types";
import { DashboardShell } from "@/components/ledgr/dashboard-shell";
import { StoreEditForm } from "./store-edit-form";

function monogramFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function StoreEditPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });

  const initials = monogramFrom(session.name);
  const sidebarStore = store
    ? {
        monogram: monogramFrom(store.storeName),
        name: store.storeName,
        status: store.status,
        slug: store.slug,
      }
    : {
        monogram: "--",
        name: "New store",
        status: "closed" as const,
      };

  // Strip mongo _id (non-serialisable) before passing to client component
  const initial = store
    ? {
        storeId: store.storeId,
        userId: store.userId,
        slug: store.slug ?? "",
        storeName: store.storeName,
        description: store.description ?? "",
        logoUrl: store.logoUrl ?? "",
        bannerUrl: store.bannerUrl ?? "",
        location: store.location ?? "",
        category: store.category ?? "",
        status: store.status,
      }
    : null;

  return (
    <DashboardShell
      store={sidebarStore}
      user={{ name: session.name, initials }}
      active="store"
    >
      <StoreEditForm initial={initial} />
    </DashboardShell>
  );
}
