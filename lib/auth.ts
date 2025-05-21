// File: lib/auth.ts

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertAirtableUser } from "@/lib/airtable";

export const authOptions: NextAuthOptions = {
  providers: [
	GoogleProvider({
	  clientId: process.env.GOOGLE_CLIENT_ID!,
	  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
	}),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
	strategy: "jwt",
	maxAge: 5 * 24 * 60 * 60, // 5 days
  },
  callbacks: {
	async signIn({ user }) {
	  // Create or update user in Airtable
	  await upsertAirtableUser({ uid: user.id, email: user.email! });
	  return true;
	},
	async jwt({ token }) {
	  return token;
	},
	async session({ session, token }) {
	  // Attach our Airtable UID to the session
	  session.user.id = token.sub!;
	  return session;
	},
  },
};
