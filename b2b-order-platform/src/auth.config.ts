import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config (no Node.js modules)
// Used by middleware. The full config with providers is in auth.ts.
export default {
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          role: string;
          despatchSessionId: string;
          despatchClientId: string;
        };
        token.role = u.role;
        token.despatchSessionId = u.despatchSessionId;
        token.despatchClientId = u.despatchClientId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { role: string }).role =
          token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
