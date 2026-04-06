import { auth } from "@/auth";
import { NextResponse } from "next/server";

const buyerOnlyRoutes = [
  "/orders/create",
  "/orders/*/receive",
  "/orders/*/change",
  "/orders/*/cancel",
];

const sellerOnlyRoutes = [
  "/despatch",
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

  // Allow public routes and API routes
  if (publicRoutes.includes(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // No session → redirect to login
  const user = req.auth?.user as { role?: string } | undefined;
  if (!user?.role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = user.role;

  // Check buyer-only routes
  if (role === "seller" && matchesPattern(pathname, buyerOnlyRoutes)) {
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  // Check seller-only routes
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
