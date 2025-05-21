// File: app/api/stripe/disconnect/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session) {
	const rec = await getUserRecord(session.user.id);
	if (rec) {
	  // Cast null to any so TS allows clearing the field
	  await Users.update(rec.id, { stripeAccountId: null as any });
	}
  }
  return NextResponse.redirect("/dashboard");
}
