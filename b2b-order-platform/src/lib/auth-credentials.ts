import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/db";
import { User } from "@/lib/types";

export function credentialsProvider() {
  return Credentials({
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
      return {
        id: user._id!.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };
    },
  });
}
