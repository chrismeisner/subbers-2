// File: app/api/stripe/disconnect/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session) {
	// assert that user is non-null
	const rec = await getUserRecord(session.user!.id);
	if (rec) {
	  await Users.update(rec.id, { stripeAccountId: null });
	}
  }
  return NextResponse.redirect("/dashboard");
}
