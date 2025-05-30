// File: app/api/stripe/subscriptions/list/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRecord } from '@/lib/airtable';
import { stripe } from '@/lib/stripe';

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

  // 3️⃣ Fetch active subscriptions, expanding customer object for email
  try {
	const list = await stripe.subscriptions.list(
	  {
		status: 'active',
		limit: 100,
		expand: ['data.customer'],
	  },
	  { stripeAccount: stripeAccountId }
	);

	// 4️⃣ Map to our minimal payload
	const subscriptions = list.data.map((s) => {
	  // Customer ID & email (expanded)
	  const cust = s.customer;
	  const customerId = typeof cust === 'string' ? cust : cust.id;
	  const customerEmail = typeof cust === 'string' ? null : cust.email ?? null;

	  // Grab first plan item
	  const item = s.items.data[0]?.price;
	  const priceId = item?.id ?? null;
	  const priceAmount = item?.unit_amount ?? null;
	  const priceCurrency = item?.currency ?? null;

	  return {
		id: s.id,
		customer: customerId,
		customer_email: customerEmail,
		status: s.status,
		current_period_end: s.current_period_end,
		priceId,
		priceAmount,
		priceCurrency,
	  };
	});

	return NextResponse.json({ subscriptions });
  } catch (err) {
	console.error('[Subscriptions List] error fetching from Stripe:', err);
	return NextResponse.json({ subscriptions: [] }, { status: 500 });
  }
}
