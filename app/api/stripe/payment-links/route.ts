// File: app/api/stripe/payment-links/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  // 1️⃣ Require an authenticated session
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ paymentLinks: [] });
  }

  // 2️⃣ Look up the connected Stripe account ID in Airtable
  const userRec = await getUserRecord(session.user.id);
  const rawStripe = userRec?.fields.stripeAccountId;
  if (!rawStripe || typeof rawStripe !== "string") {
	return NextResponse.json({ paymentLinks: [] });
  }

  // 3️⃣ Fetch the list of payment links (no deep expand here)
  const linkList = await stripe.paymentLinks.list(
	{ limit: 20 },
	{ stripeAccount: rawStripe }
  );

  // 4️⃣ For each link, grab its first line-item to extract price & title
  const paymentLinks = await Promise.all(
	linkList.data.map(async (pl) => {
	  let title: string | null = null;
	  let priceAmount: number | null = null;
	  let priceCurrency: string | null = null;

	  try {
		// fetch just the first line item, expanding its price.product
		const lineItems = await stripe.paymentLinks.listLineItems(
		  pl.id,
		  { limit: 1, expand: ["data.price.product"] },
		  { stripeAccount: rawStripe }
		);

		const first = lineItems.data[0];
		if (first && first.price) {
		  // amount in cents
		  priceAmount = first.price.unit_amount ?? null;
		  priceCurrency = first.price.currency ?? null;

		  // product.name comes along with expand
		  if (
			first.price.product &&
			typeof first.price.product !== "string"
		  ) {
			title = first.price.product.name;
		  }
		}
	  } catch (err) {
		console.error(
		  `[PaymentLinks] failed to fetch line items for ${pl.id}:`,
		  err
		);
	  }

	  return {
		id: pl.id,
		url: pl.url,
		active: pl.active,
		title,
		priceAmount,
		priceCurrency,
	  };
	})
  );

  // 5️⃣ Return JSON
  return NextResponse.json({ paymentLinks });
}
