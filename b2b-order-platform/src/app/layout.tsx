import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Ledgr — Independent shops, one checkout",
  description: "A marketplace of independent shops. One cart per shop, one checkout per order.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-paper-2 font-sans text-ink antialiased">
        <CartProvider>{children}</CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
