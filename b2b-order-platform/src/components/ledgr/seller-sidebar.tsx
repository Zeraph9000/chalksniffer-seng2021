import Link from "next/link";
import {
  LayoutGrid,
  Store as StoreIcon,
  Package,
  ShoppingCart,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { cn } from "@/lib/utils";

export type SellerSidebarStore = {
  monogram: string;
  name: string;
  status: "active" | "paused" | "closed";
  slug?: string;
};

export type SellerSidebarUser = {
  name: string;
  initials: string;
};

export type SellerSidebarActive =
  | "dashboard"
  | "store"
  | "products"
  | "orders"
  | "invoices";

export interface SellerSidebarProps {
  store: SellerSidebarStore;
  user: SellerSidebarUser;
  active: SellerSidebarActive;
  /** Count shown as the orders badge (if > 0) */
  ordersBadge?: number;
}

const statusLabel: Record<SellerSidebarStore["status"], string> = {
  active: "active",
  paused: "paused",
  closed: "closed",
};

const statusDotBg: Record<SellerSidebarStore["status"], string> = {
  active: "bg-accent",
  paused: "bg-warn",
  closed: "bg-danger",
};

type NavItem = {
  id: SellerSidebarActive;
  label: string;
  href: string;
  Icon: typeof LayoutGrid;
};

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", Icon: LayoutGrid },
  { id: "store", label: "Store", href: "/dashboard/store", Icon: StoreIcon },
  { id: "products", label: "Products", href: "/dashboard/products", Icon: Package },
  { id: "orders", label: "Orders", href: "/dashboard/orders", Icon: ShoppingCart },
  { id: "invoices", label: "Invoices", href: "/dashboard/invoices", Icon: FileText },
];

export function SellerSidebar({ store, user, active, ordersBadge }: SellerSidebarProps) {
  const publicHref = store.slug ? `/store/${store.slug}` : "#";
  return (
    <aside className="w-[240px] bg-[#0c0d10] text-[#d7dadf] p-5 flex flex-col gap-5 min-h-screen">
      <div className="px-2 py-1">
        <BrandLockup variant="light" size="md" href="/dashboard" />
      </div>

      <div className="px-2 py-1.5 flex items-center gap-2.5">
        <div className="w-[30px] h-[30px] rounded-[7px] bg-brand text-brand-ink grid place-items-center font-display font-bold text-[12px] tracking-[-.02em]">
          {store.monogram}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[13px] text-white tracking-[-.005em] truncate">
            {store.name}
          </div>
          <div className="text-[10.5px] text-[#8a8f98] mt-[1px] flex items-center gap-[5px]">
            <span className={cn("w-[5px] h-[5px] rounded-full inline-block", statusDotBg[store.status])} />
            <span>Store · {statusLabel[store.status]}</span>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {NAV.map(({ id, label, href, Icon }) => {
          const isActive = id === active;
          return (
            <Link
              key={id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "px-3 py-2 rounded-[7px] flex items-center gap-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-white/[0.06] text-white [&_svg]:text-hot"
                  : "text-[#a0a5ad] hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <Icon className="h-[15px] w-[15px]" strokeWidth={1.6} />
              <span>{label}</span>
              {id === "orders" && ordersBadge && ordersBadge > 0 ? (
                <span className="ml-auto font-mono text-[10.5px] bg-hot text-white px-1.5 py-[1px] rounded-full">
                  {ordersBadge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/[0.08] flex flex-col gap-2">
        <Link
          href={publicHref}
          target={store.slug ? "_blank" : undefined}
          rel={store.slug ? "noopener noreferrer" : undefined}
          className="px-3 py-2 text-[12px] text-[#a0a5ad] rounded-[7px] inline-flex items-center justify-between hover:bg-white/[0.04] hover:text-white transition-colors"
        >
          <span>View public storefront</span>
          <ArrowUpRight className="h-3 w-3" strokeWidth={1.6} />
        </Link>

        <div className="px-2 py-2 bg-white/[0.03] rounded-[10px] flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-full bg-white text-ink grid place-items-center font-display font-bold text-[11.5px] tracking-[-.02em]">
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-white font-medium truncate">{user.name}</div>
            <div className="text-[10.5px] text-[#8a8f98] truncate">Owner</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
