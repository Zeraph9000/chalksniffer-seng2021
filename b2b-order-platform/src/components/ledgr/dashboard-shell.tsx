import * as React from "react";
import { SellerSidebar, type SellerSidebarProps } from "./seller-sidebar";

export interface DashboardShellProps {
  store: SellerSidebarProps["store"];
  user: SellerSidebarProps["user"];
  active: SellerSidebarProps["active"];
  ordersBadge?: number;
  children: React.ReactNode;
}

export function DashboardShell({ store, user, active, ordersBadge, children }: DashboardShellProps) {
  return (
    <div className="grid grid-cols-[240px_1fr] min-h-screen bg-paper-2">
      <SellerSidebar store={store} user={user} active={active} ordersBadge={ordersBadge} />
      <main className="overflow-y-auto bg-paper-2 relative">{children}</main>
    </div>
  );
}
