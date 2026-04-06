import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toast } from "@/components/toast";
import { getSessionOrNull } from "@/lib/session";
import { Suspense } from "react";
import { CartProvider } from "@/lib/cart-context";

export const metadata: Metadata = {
  title: "Ledgr — Construction Supply Management",
  description: "Order, track, and invoice construction materials",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionOrNull();
  const hasSession = !!session?.role;

  return (
    <html lang="en">
      <body className="bg-surface font-sans text-ink antialiased">
        <CartProvider>
          <Suspense>
            <Toast />
          </Suspense>
          {hasSession ? (
            <div className="flex h-screen">
              <Sidebar role={session?.role ?? null} name={session?.name ?? ""} />
              <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
            </div>
          ) : (
            <main>{children}</main>
          )}
        </CartProvider>
      </body>
    </html>
  );
}
