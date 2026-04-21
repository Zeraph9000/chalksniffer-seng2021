import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Route-level auth gates. Role-specific checks beyond "has session" are
 * performed inside each route handler (middleware can't read the full
 * session role reliably via @auth/mongodb-adapter without extra work).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await auth();

  if (pathname.startsWith("/dashboard")) {
    if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    pathname === "/orders"
    || pathname.startsWith("/orders/recurring")
    || pathname === "/recommendations"
    || pathname === "/profile"
  ) {
    if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/orders", "/orders/recurring/:path*", "/recommendations", "/profile"],
};
