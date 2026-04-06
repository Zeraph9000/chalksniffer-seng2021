"use client";

import { UserRole } from "@/lib/types";

export function RoleBadge({ role }: { role: UserRole }) {
  const isBuyer = role === "buyer";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-widest ${
        isBuyer
          ? "bg-accent-buyer/10 text-accent-buyer ring-1 ring-accent-buyer/20"
          : "bg-accent-seller/10 text-accent-seller ring-1 ring-accent-seller/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isBuyer ? "bg-accent-buyer" : "bg-accent-seller"
        }`}
      />
      {isBuyer ? "Buyer" : "Seller"}
    </span>
  );
}
