// File: app/api/stripe/subscriptions/list/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRecord } from '@/lib/airtable';
import { stripe } from '@/lib/stripe';
import type { Stripe } from 'stripe';

export async function GET(req: Request) {
  // 1️⃣ Authenticate user
  const session = await getServerSession(authOptions);
  if (!session) {
	return NextResponse.json({ subscriptions: [] }, { status: 401 });
  }

  // 2️⃣ Look up connected Stripe account
  const userRec = await getUserRecord(session.user.id);
  const rawStripe = userRec?.fields.stripeAccountId;
  if (!rawStripe || typeof rawStripe !== 'string') {
	return NextResponse.json({ subscriptions: [] });
  }
  const stripeAccountId = rawStripe;

  try {
	// 3️⃣ Fetch active subscriptions, expanding only customer & price
	const list = await stripe.subscriptions.list(
	  {
		status: 'active',
		limit: 100,
		expand: ['data.customer', 'data.items.data.price'],
	  },
	  { stripeAccount: stripeAccountId }
	);

	// 4️⃣ Build minimal subscription objects
	const subscriptions = list.data.map((s) => {
	  const cust = s.customer as Stripe.Customer;
	  const item = s.items.data[0]?.price as Stripe.Price;

	  return {
		id: s.id,
		title: null as string | null,             // fill in next
		customer: cust.id,
		customer_email: cust.email ?? null,
		status: s.status,
		priceId: item?.id ?? null,
		priceAmount: item?.unit_amount ?? null,
		priceCurrency: item?.currency ?? null,
	  };
	});

	// 5️⃣ Fetch product names in a second call
	await Promise.all(
	  subscriptions.map(async (sub) => {
		if (sub.priceId) {
		  try {
			const priceObj = await stripe.prices.retrieve(
			  sub.priceId,
			  { expand: ['product'] },
			  { stripeAccount: stripeAccountId }
			);
			if (priceObj.product && typeof priceObj.product !== 'string') {
			  sub.title = priceObj.product.name;
			}
		  } catch (err) {
			console.error(
			  `[Subscriptions List] failed to fetch product for price ${sub.priceId}:`,
			  err
			);
		  }
		}
	  })
	);

	return NextResponse.json({ subscriptions });
  } catch (err) {
	console.error('[Subscriptions List] error fetching from Stripe:', err);
	return NextResponse.json({ subscriptions: [] }, { status: 500 });
  }
}
