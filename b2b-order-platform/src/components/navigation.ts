import { UserRole } from "@/lib/types";

export type NavigationLink = {
  href: string;
  label: string;
};

/**
 * Seller-only sidebar navigation. Buyers don't have a global sidebar — their
 * navigation is surfaced inside each storefront.
 */
const sellerLinks: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/store", label: "Store" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/invoices", label: "Invoices" },
];

export function getPrimaryNavigation(role: UserRole | null): NavigationLink[] {
  if (role === "seller") return sellerLinks;
  return [];
}

export function getHomeHref(role: UserRole | null): string {
  return role === "seller" ? "/dashboard" : "/";
}
