import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";
import { makeAuthConfig } from "./auth.config";
import { credentialsProvider } from "./lib/auth-credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...makeAuthConfig("chalk.buyer", "/login"),
  adapter: MongoDBAdapter(clientPromise),
  providers: [credentialsProvider()],
});
