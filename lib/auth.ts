import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import type { User } from "@/lib/models/types";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = await getDb();
        const user = await db.collection<User>("users").findOne({ email: credentials.email });
        if (!user) return null;

        // Enforce the account lifecycle rules from spec section 10 —
        // pending/removed accounts can't log in, and expired bulk-generated
        // accounts (50 days from creation) are cut off automatically.
        if (user.status === "pending-approval") throw new Error("Account pending approval");
        if (user.status === "removed") throw new Error("Account has been removed");
        if (user.status === "expired" || (user.expiresAt && user.expiresAt < new Date())) {
          if (user.status !== "expired") {
            await db.collection<User>("users").updateOne({ _id: user._id }, { $set: { status: "expired" } });
          }
          throw new Error("Account has expired");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id!.toString(),
          name: user.fullName,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    }
  }
};
