import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toast } from "@/components/toast";
import { getSessionOrNull } from "@/lib/session";
import { Suspense } from "react";
import { CartProvider } from "@/lib/cart-context";

export const metadata: Metadata = {
  title: "Ledgr — Independent shops, one checkout",
  description: "A marketplace of independent shops. One cart per shop, one checkout per order.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: Awaited<ReturnType<typeof getSessionOrNull>> = null;
  try {
    session = await getSessionOrNull();
  } catch (error) {
    console.error("Failed to load session in layout:", error);
  }
  // Sidebar is seller-only. Buyers and guests see full-width content; their
  // navigation lives inside each storefront (store-scoped) per product spec.
  const isSeller = session?.role === "seller";

  return (
    <html lang="en">
      <body className="bg-paper-2 font-sans text-ink antialiased">
        <CartProvider>
          <Suspense>
            <Toast />
          </Suspense>
          {isSeller ? (
            <div className="flex h-screen">
              <Sidebar role={session?.role ?? null} name={session?.name ?? ""} avatarUrl={session?.avatarUrl} />
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
