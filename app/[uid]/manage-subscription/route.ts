// File: app/[uid]/manage-subscription/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserRecord, Users } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

/**
 * GET /<uid>/manage-subscription
 *
 * 1️⃣ Extract the merchant’s UID from the dynamic route.
 * 2️⃣ Look up that user’s record in Airtable to get:
 *     - stripeAccountId  (the Connect account ID)
 *     - stripeCustomerId (the Customer ID, or create one if missing)
 * 3️⃣ Create a new Customer Portal session via Stripe’s API
 * 4️⃣ Return a 302 redirect to portalSession.url
 *
 * This endpoint does NOT require NextAuth or any extra token. It simply
 * trusts that anyone hitting `/uid/manage-subscription` is allowed to
 * open that merchant’s portal link.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  // 1️⃣ Await dynamic params and extract the UID
  const { uid } = await params;

  // 2️⃣ Look up the merchant’s Airtable record
  const userRec = await getUserRecord(uid);
  if (!userRec) {
	return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  // Must have a connected Stripe account ID in Airtable
  const rawAcct = userRec.fields.stripeAccountId as string | undefined;
  if (!rawAcct) {
	return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 });
  }
  const stripeAccountId = rawAcct;

  // 2a️⃣ Ensure a Stripe Customer exists (create one if missing)
  let stripeCustomerId = userRec.fields.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
	try {
	  const customer = await stripe.customers.create(
		{ email: userRec.fields.Email as string },
		{ stripeAccount: stripeAccountId }
	  );
	  stripeCustomerId = customer.id;
	  // Persist the new customer ID into Airtable
	  await Users.update(userRec.id, { stripeCustomerId });
	} catch (err) {
	  console.error("[ManageSubscription] Failed to create Stripe Customer:", err);
	  return NextResponse.json(
		{ error: "Failed to create Stripe Customer" },
		{ status: 500 }
	  );
	}
  }

  // 3️⃣ Create a fresh Customer Portal session
  let portalSession;
  try {
	const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
	const returnUrl = `${origin}/dashboard`;

	portalSession = await stripe.billingPortal.sessions.create(
	  {
		customer: stripeCustomerId,
		return_url: returnUrl,
	  },
	  { stripeAccount: stripeAccountId }
	);
  } catch (err) {
	console.error("[ManageSubscription] Failed to create portal session:", err);
	return NextResponse.json(
	  { error: "Failed to create portal session" },
	  { status: 500 }
	);
  }

  // 4️⃣ Redirect the browser straight into Stripe’s hosted Customer Portal
  return NextResponse.redirect(portalSession.url!);
}
