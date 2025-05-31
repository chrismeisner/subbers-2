// File: app/api/stripe/customer-portal/url/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/stripe/customer-portal/url
 *
 * 1. Authenticate via NextAuth to find the current user (merchant).
 * 2. Look up that user’s Airtable record to get:
 *    - stripeAccountId  (the connected Stripe account)
 *    - optionally stripeCustomerId  (not needed here, but we leave it if you’ve been creating it elsewhere)
 * 3. List existing Billing Portal Configurations on that connected account.
 *    - If none exist, create a new configuration with default settings.
 * 4. Return the “url” field from that configuration object.  This is the 
 *    static Customer Portal link to share with all of that merchant’s subscribers.
 */
export async function GET(req: Request) {
  // 1️⃣ Authenticate
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  // 2️⃣ Look up our merchant’s Airtable record (Users table)
  const userRec = await getUserRecord(uid);
  if (!userRec) {
	return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Must have a connected Stripe account
  const rawAcct = userRec.fields.stripeAccountId;
  if (!rawAcct || typeof rawAcct !== "string") {
	return NextResponse.json(
	  { error: "No Stripe account connected" },
	  { status: 400 }
	);
  }
  const stripeAccountId = rawAcct;

  // 3️⃣ Fetch existing Portal Configurations on that connected account
  let configList;
  try {
	configList = await stripe.billingPortal.configurations.list(
	  { limit: 1 },
	  { stripeAccount: stripeAccountId }
	);
  } catch (err: any) {
	console.error(
	  "[Portal URL] Failed to list configurations:",
	  err
	);
	return NextResponse.json(
	  { error: "Could not fetch portal configuration" },
	  { status: 500 }
	);
  }

  let portalConfig = configList.data[0];
  if (!portalConfig) {
	// 3a) If no configuration exists, create a default one
	try {
	  portalConfig = await stripe.billingPortal.configurations.create(
		{
		  business_profile: {
			headline: "Manage your billing and subscriptions",
			// Optionally set your brand’s name or logo here
			// logo: "https://your‐cdn.com/logo.png",
		  },
		  features: {
			customer_update: {
			  enabled: true,
			  allowed_updates: ["email", "phone", "card", "tax_id"],
			},
			invoice_history: { enabled: true },
			subscription_cancel: {
			  enabled: true,
			  mode: "at_period_end", // let customers cancel at period end
			},
			subscription_update: {
			  enabled: true,
			  default_allowed_updates: ["price"],
			},
		  },
		},
		{ stripeAccount: stripeAccountId }
	  );
	} catch (err: any) {
	  console.error(
		"[Portal URL] Failed to create configuration:",
		err
	  );
	  return NextResponse.json(
		{ error: "Could not create portal configuration" },
		{ status: 500 }
	  );
	}
  }

  // 4️⃣ Now we have a portalConfig; return its "url" field
  //    This is the static link you share with all subscribers of this account.
  if (portalConfig.url) {
	return NextResponse.json({ url: portalConfig.url });
  } else {
	return NextResponse.json(
	  { error: "No portal URL available" },
	  { status: 500 }
	);
  }
}
