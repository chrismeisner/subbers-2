// File: lib/auth.ts

import NextAuth from "next-auth/next";
import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertAirtableUser } from "@/lib/airtable";

export const authOptions: AuthOptions = {
  providers: [
	GoogleProvider({
	  clientId: process.env.GOOGLE_CLIENT_ID!,
	  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
	}),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
	// now TS knows this must be one of the literal SessionStrategy values
	strategy: "jwt",
	maxAge: 5 * 24 * 60 * 60, // 5 days
  },
  callbacks: {
	async signIn({ user }) {
	  await upsertAirtableUser({ uid: user.id, email: user.email! });
	  return true;
	},
	async jwt({ token }) {
	  return token;
	},
	async session({ session, token }) {
	  session.user.id = token.sub!;
	  return session;
	},
  },
};

export default NextAuth(authOptions);
