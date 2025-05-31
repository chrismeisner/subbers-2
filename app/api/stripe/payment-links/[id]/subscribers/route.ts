// File: app/api/stripe/payment-links/[id]/subscribers/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  // 1️⃣ Authenticate user
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json(
	  { subscribers: [], error: "Unauthorized" },
	  { status: 401 }
	);
  }
  const uid = session.user.id;

  // 2️⃣ Lookup Airtable “Users” record → get stripeAccountId
  const userRec = await getUserRecord(uid);
  const rawStripe = userRec?.fields.stripeAccountId;
  if (!rawStripe || typeof rawStripe !== "string") {
	return NextResponse.json(
	  { subscribers: [], error: "No Stripe account connected" },
	  { status: 400 }
	);
  }
  const stripeAccountId = rawStripe;

  // 3️⃣ Await params and extract payment-link ID
  const { id: paymentLinkId } = await context.params;

  // 4️⃣ Fetch Checkout Sessions for that payment link
  let sessions: Stripe.ApiList<Stripe.Checkout.Session>;
  try {
	sessions = await stripe.checkout.sessions.list(
	  {
		limit: 100,
		payment_link: paymentLinkId,
		expand: ["data.customer_details"],
	  },
	  { stripeAccount: stripeAccountId }
	);
  } catch (err: any) {
	console.error(
	  `[PaymentLinks/Subscribers] Failed to list sessions for link ${paymentLinkId}:`,
	  err
	);
	return NextResponse.json(
	  { subscribers: [], error: "Failed to fetch sessions" },
	  { status: 500 }
	);
  }

  // 5️⃣ Map each session to a simple “subscriber” object
  const subscribers = sessions.data.map((s) => ({
	sessionId: s.id,
	created: s.created, // UNIX timestamp
	customerId: s.customer_details?.customer || null,
	customerEmail: s.customer_details?.email || null,
	paymentStatus: s.payment_status,
	subscriptionId:
	  s.mode === "subscription" && typeof s.subscription === "string"
		? s.subscription
		: null,
	amountTotal: s.amount_total,
	currency: s.currency,
  }));

  return NextResponse.json({ subscribers });
}
