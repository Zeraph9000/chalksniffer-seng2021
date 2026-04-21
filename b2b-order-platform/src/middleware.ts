import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

/**
 * Edge-safe middleware: uses the bare `authConfig` (no adapter, no bcrypt) so
 * it can run on the Next.js edge runtime. Role-specific checks happen inside
 * route handlers / server components where the full `@/auth` is available.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth?.user;

  if (pathname.startsWith("/dashboard") && !isAuthed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    (pathname === "/orders"
      || pathname.startsWith("/orders/recurring")
      || pathname === "/recommendations"
      || pathname === "/profile")
    && !isAuthed
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/orders", "/orders/recurring/:path*", "/recommendations", "/profile"],
};
