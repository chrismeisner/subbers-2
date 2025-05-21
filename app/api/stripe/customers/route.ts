// File: app/api/stripe/customers/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  // 1️⃣ Ensure the user is signed in
  const session = await getServerSession(authOptions);
  if (!session) {
	return NextResponse.json({ customers: [] });
  }

  // 2️⃣ Fetch the Airtable record to get their connected Stripe account
  const userRec = await getUserRecord(session.user.id);
  const stripeAccountId = userRec?.fields.stripeAccountId;
  if (!stripeAccountId) {
	return NextResponse.json({ customers: [] });
  }

  // 3️⃣ List up to 100 customers from that connected account
  const list = await stripe.customers.list(
	{ limit: 100 },
	{ stripeAccount: stripeAccountId }
  );

  // 4️⃣ Return the array of customer objects
  return NextResponse.json({ customers: list.data });
}
