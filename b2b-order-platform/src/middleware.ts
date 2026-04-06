import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

const buyerOnlyRoutes = [
  "/marketplace",
  "/cart",
  "/checkout",
  "/orders/*/receive",
  "/orders/*/cancel",
  "/orders/*/edit",
];

const sellerOnlyRoutes = [
  "/catalogue",
  "/despatch/create",
  "/invoices/create",
];

const publicRoutes = ["/login"];

function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, "[^/]+") + "$"
    );
    return regex.test(pathname);
  });
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (publicRoutes.includes(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const user = req.auth?.user as { role?: string } | undefined;
  if (!user?.role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = user.role;

  if (role === "seller" && matchesPattern(pathname, buyerOnlyRoutes)) {
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  if (role === "buyer" && matchesPattern(pathname, sellerOnlyRoutes)) {
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
