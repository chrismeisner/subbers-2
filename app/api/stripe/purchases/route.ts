// File: app/api/stripe/purchases/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRecord } from '@/lib/airtable';
import { stripe } from '@/lib/stripe';

export async function GET(req: Request) {
  // 1️⃣ Authenticate user
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ purchases: [], hasMore: false });
  }

  // 2️⃣ Look up the connected Stripe account ID in Airtable
  const userRec = await getUserRecord(session.user.id);
  const rawStripe = userRec?.fields.stripeAccountId;
  if (!rawStripe || typeof rawStripe !== 'string') {
	return NextResponse.json({ purchases: [], hasMore: false });
  }
  const stripeAccountId = rawStripe;

  // 3️⃣ Parse pagination params from the query string
  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  const startingAfter = url.searchParams.get('starting_after') || undefined;

  // 4️⃣ Fetch Checkout Sessions from Stripe with pagination
  const sessions = await stripe.checkout.sessions.list(
	{
	  limit,
	  ...(startingAfter ? { starting_after: startingAfter } : {}),
	},
	{ stripeAccount: stripeAccountId }
  );

  // 5️⃣ For each session, fetch its first line item, fallback to session.url, and surface payment_link ID
  const purchases = await Promise.all(
	sessions.data.map(async (s) => {
	  let productName: string | null = null;
	  let isRecurring = false;

	  // Fallback to the session's own URL if available
	  let viewUrl: string | null = s.url ?? null;

	  // Fetch line item for product info
	  try {
		const lineItems = await stripe.checkout.sessions.listLineItems(
		  s.id,
		  { limit: 1, expand: ['data.price.product'] },
		  { stripeAccount: stripeAccountId }
		);
		const item = lineItems.data[0];
		if (item && item.price) {
		  if (typeof item.price.product !== 'string') {
			productName = item.price.product.name;
		  }
		  isRecurring = Boolean(item.price.recurring);
		}
	  } catch {
		// ignore errors fetching line items
	  }

	  // If this session was created via a Payment Link, override viewUrl with that link
	  if (s.payment_link) {
		try {
		  const pl = await stripe.paymentLinks.retrieve(
			s.payment_link,
			{ stripeAccount: stripeAccountId }
		  );
		  viewUrl = pl.url ?? viewUrl;
		} catch {
		  // ignore errors fetching payment link
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

		// NEW: surface the raw payment_link ID (e.g. "plink_1RUUC0IHCU1xjU1mWWAqBAWf")
		paymentLinkId: s.payment_link ?? null,

		url: viewUrl,
	  };
	})
  );

  // 6️⃣ Return the enriched purchase history plus pagination flag
  return NextResponse.json({
	purchases,
	hasMore: sessions.has_more,
  });
}