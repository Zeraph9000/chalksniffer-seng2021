import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/db";
import { User } from "@/lib/types";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;

        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection<User>("users").findOne({ email });

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // Create a fresh Despatch session using stored credentials
        const despatchRes = await fetch(
          `${process.env.DESPATCH_API_URL}/sessions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: user.despatch.email,
              password: user.despatch.password,
            }),
          }
        );

        let despatchSessionId = "";
        let despatchClientId = "";
        if (despatchRes.ok) {
          const despatchSession = await despatchRes.json();
          despatchSessionId = despatchSession.sessionId;
          despatchClientId = despatchSession.clientId;
        }

        return {
          id: user._id!.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          despatchSessionId,
          despatchClientId,
        };
      },
    }),
  ],
});
