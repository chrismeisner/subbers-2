// File: app/api/stripe/customers/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  // 1️⃣ Ensure the user is signed in
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ customers: [] });
  }

  // 2️⃣ Fetch Airtable record and grab the raw field
  const userRec = await getUserRecord(session.user.id);
  const rawStripe = userRec?.fields.stripeAccountId;

  // 3️⃣ Only proceed if it's really a string
  if (!rawStripe || typeof rawStripe !== "string") {
	return NextResponse.json({ customers: [] });
  }
  const stripeAccountId = rawStripe;

  // 4️⃣ Now TS knows stripeAccountId is a string
  const list = await stripe.customers.list(
	{ limit: 100 },
	{ stripeAccount: stripeAccountId }
  );

  // 5️⃣ Return the results
  return NextResponse.json({ customers: list.data });
}
