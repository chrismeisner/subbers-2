// File: app/api/stripe/disconnect/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";

export async function GET() {
  const session = await getServerSession(authOptions);

  // Ensure we have a valid session and user ID
  if (!session || !session.user?.id) {
	return NextResponse.redirect("/dashboard");
  }

  // Assert that user.id exists
  const { id: uid } = session.user as { id: string };

  const rec = await getUserRecord(uid);
  if (rec) {
	await Users.update(rec.id, { stripeAccountId: null });
  }

  return NextResponse.redirect("/dashboard");
}
