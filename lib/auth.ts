// File: lib/auth.ts

import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { upsertAirtableUser } from "@/lib/airtable";

export const authOptions = {
  providers: [
	GoogleProvider({
	  clientId: process.env.GOOGLE_CLIENT_ID!,
	  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
	}),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
	strategy: "jwt" as const,
	maxAge: 5 * 24 * 60 * 60, // 5 days
  },
  callbacks: {
	async signIn({ user }: { user: any }) {
	  await upsertAirtableUser({ uid: user.id, email: user.email! });
	  return true;
	},
	async jwt({ token }: { token: any }) {
	  return token;
	},
	async session({
	  session,
	  token,
	}: {
	  session: any;
	  token: any;
	}) {
	  session.user.id = token.sub!;
	  return session;
	},
  },
};

export default NextAuth(authOptions);
