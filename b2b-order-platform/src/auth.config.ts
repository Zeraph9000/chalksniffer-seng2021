import type { NextAuthConfig } from "next-auth";

export function makeAuthConfig(cookieName: string, signInPath: string): NextAuthConfig {
  return {
    providers: [],
    session: { strategy: "jwt" },
    cookies: {
      sessionToken: {
        name: cookieName,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        },
      },
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.role = (user as unknown as { role: string }).role;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as unknown as { role: string }).role = token.role as string;
        }
        return session;
      },
    },
    pages: {
      signIn: signInPath,
    },
  };
}

// Default export retained for edge middleware. Buyer cookie name.
const defaultConfig: NextAuthConfig = makeAuthConfig("chalk.buyer", "/login");
export default defaultConfig;
