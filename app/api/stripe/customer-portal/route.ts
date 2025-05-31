// File: app/api/stripe/customer-portal/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/stripe/customer-portal
 *
 * 1. Ensure the user is authenticated via NextAuth.
 * 2. Look up the user’s Airtable record to get:
 *    - stripeAccountId (connected Stripe Connect account)
 *    - stripeCustomerId (if already created)
 * 3. If no stripeCustomerId, create a new Customer on the connected account and persist it to Airtable.
 * 4. Check if the connected account has an existing Customer Portal configuration:
 *    - If not, create one with default features.
 * 5. Create a one-time Customer Portal session and return its URL.
 */
export async function GET(req: Request) {
  // 1️⃣ Authenticate via NextAuth
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  // 2️⃣ Fetch Airtable “Users” record
  const userRec = await getUserRecord(uid);
  if (!userRec) {
	return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Must have a connected Stripe Account
  const rawStripeAcct = userRec.fields.stripeAccountId;
  if (!rawStripeAcct || typeof rawStripeAcct !== "string") {
	return NextResponse.json(
	  { error: "No Stripe account connected" },
	  { status: 400 }
	);
  }
  const stripeAccountId = rawStripeAcct;

  // 3️⃣ Ensure a Stripe Customer exists on that connected account
  let stripeCustomerId = userRec.fields.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
	try {
	  const customer = await stripe.customers.create(
		{ email: session.user.email },
		{ stripeAccount: stripeAccountId }
	  );
	  stripeCustomerId = customer.id;

	  // Persist back to Airtable
	  await Users.update(userRec.id, { stripeCustomerId });
	} catch (err: any) {
	  console.error("[Customer Portal] Failed to create Customer:", err);
	  return NextResponse.json(
		{ error: "Failed to create Stripe Customer" },
		{ status: 500 }
	  );
	}
  }

  // 4️⃣ Ensure the Customer Portal is configured on the connected account
  // We list existing configurations (limit=1). If none, we create a default one.
  try {
	const existingConfigs = await stripe.billingPortal.configurations.list(
	  { limit: 1 },
	  { stripeAccount: stripeAccountId }
	);

	if (existingConfigs.data.length === 0) {
	  // No configuration exists → create one with sensible defaults
	  // Adjust features as needed for your use-case.
	  await stripe.billingPortal.configurations.create(
		{
		  business_profile: {
			// You can customize the name/URL shown in the Portal header
			headline: "Manage your billing and subscriptions",
		  },
		  features: {
			customer_update: {
			  enabled: true,
			  allowed_updates: ["email", "phone", "card", "tax_id"],
			},
			invoice_history: {
			  enabled: true,
			},
			subscription_cancel: {
			  enabled: true,
			  mode: "at_period_end", // let them cancel at period end
			},
			subscription_update: {
			  enabled: true,
			  default_allowed_updates: ["price"],
			},
		  },
		},
		{ stripeAccount: stripeAccountId }
	  );
	  // After this, the connected account has a default Portal configuration.
	}
  } catch (err: any) {
	console.error("[Customer Portal] Configuration check/create failed:", err);
	return NextResponse.json(
	  { error: "Failed to configure Customer Portal" },
	  { status: 500 }
	);
  }

  // 5️⃣ Create a one-time Customer Portal session
  let portalSession;
  try {
	// Use NEXT_PUBLIC_APP_URL or fallback to request origin
	const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
	const returnUrl = `${origin}/dashboard`;

	portalSession = await stripe.billingPortal.sessions.create(
	  {
		customer: stripeCustomerId,
		return_url: returnUrl,
	  },
	  { stripeAccount: stripeAccountId }
	);
  } catch (err: any) {
	console.error("[Customer Portal] Failed to create portal session:", err);
	return NextResponse.json(
	  { error: "Failed to create Customer Portal session" },
	  { status: 500 }
	);
  }

  // 6️⃣ Return the one-time URL
  return NextResponse.json({ url: portalSession.url });
}
