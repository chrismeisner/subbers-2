// File: app/api/stripe/purchases/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  // 1️⃣ Authenticate user
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ purchases: [] });
  }

  // 2️⃣ Look up the connected Stripe account ID in Airtable
  const userRec = await getUserRecord(session.user.id);
  const rawStripe = userRec?.fields.stripeAccountId;
  if (!rawStripe || typeof rawStripe !== "string") {
	return NextResponse.json({ purchases: [] });
  }
  const stripeAccountId = rawStripe;

  // 3️⃣ Fetch recent Checkout Sessions (latest 20)
  const sessions = await stripe.checkout.sessions.list(
	{ limit: 20 },
	{ stripeAccount: stripeAccountId }
  );

  // 4️⃣ For each session, fetch its first line item to get product and recurring info,
  //    and retrieve the Payment Link URL if available
  const purchases = await Promise.all(
	sessions.data.map(async (s) => {
	  let productName: string | null = null;
	  let isRecurring = false;
	  let viewUrl: string | null = null;

	  // Fetch line item for product info
	  try {
		const lineItems = await stripe.checkout.sessions.listLineItems(
		  s.id,
		  { limit: 1, expand: ["data.price.product"] },
		  { stripeAccount: stripeAccountId }
		);
		const item = lineItems.data[0];
		if (item && item.price) {
		  if (typeof item.price.product !== "string") {
			productName = item.price.product.name;
		  }
		  isRecurring = Boolean(item.price.recurring);
		}
	  } catch {
		// ignore
	  }

	  // Retrieve Payment Link URL if session.payment_link is set
	  if (s.payment_link) {
		try {
		  const pl = await stripe.paymentLinks.retrieve(
			s.payment_link,
			{ stripeAccount: stripeAccountId }
		  );
		  viewUrl = pl.url ?? null;
		} catch {
		  // ignore
		}
	  }

	  return {
		id: s.id,
		created: s.created,
		customer_email: s.customer_details?.email ?? null,
		payment_status: s.payment_status,
		productName,
		isRecurring,
		amount_total: s.amount_total,
		currency: s.currency,
		url: viewUrl,
	  };
	})
  );

  // 5️⃣ Return the enriched purchase history
  return NextResponse.json({ purchases });
}
