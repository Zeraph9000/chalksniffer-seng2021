import { NextRequest, NextResponse } from "next/server";

// Edge runtime cannot import @/auth.buyer or @/auth.seller (bcrypt/mongodb).
// Read cookies directly.
const BUYER_COOKIE = "chalk.buyer";
const SELLER_COOKIE = "chalk.seller";

function safeNext(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasBuyer = !!req.cookies.get(BUYER_COOKIE);
  const hasSeller = !!req.cookies.get(SELLER_COOKIE);

  // Seller area requires seller cookie.
  if (pathname.startsWith("/dashboard") && pathname !== "/dashboard/login") {
    if (!hasSeller) {
      const url = new URL("/dashboard/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Already logged in? Skip login pages.
  if (pathname === "/login" && hasBuyer) {
    const next = safeNext(req.nextUrl.searchParams.get("next"), "/");
    return NextResponse.redirect(new URL(next, req.url));
  }
  if (pathname === "/dashboard/login" && hasSeller) {
    const next = safeNext(req.nextUrl.searchParams.get("next"), "/dashboard");
    return NextResponse.redirect(new URL(next, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/dashboard/login"],
};
