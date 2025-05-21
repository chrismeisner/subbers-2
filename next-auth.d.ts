// next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
	user: {
	  /** comes from token.sub in your jwt→session callback */
	  id: string;
	  name?: string | null;
	  email?: string | null;
	  image?: string | null;
	};
  }
}
