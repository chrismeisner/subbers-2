// File: app/api/stripe/import-subscription/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getUserRecord,
  getSubscriptionPackageByPriceId,
  upsertSubscriber,
} from '@/lib/airtable';
import { stripe } from '@/lib/stripe';
import type { Stripe } from 'stripe';

export async function POST(req: Request) {
  // 1️⃣ Authenticate user
  const session = await getServerSession(authOptions);
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2️⃣ Look up connected Stripe account
  const userRec = await getUserRecord(session.user.id);
  const stripeAccountId = userRec?.fields.stripeAccountId;
  if (!stripeAccountId || typeof stripeAccountId !== 'string') {
	return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 });
  }

  // 3️⃣ Parse request body
  const { subscriptionId } = await req.json();
  if (!subscriptionId) {
	return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
  }

  // 4️⃣ Retrieve the subscription from Stripe
  let subscription: Stripe.Subscription;
  try {
	subscription = await stripe.subscriptions.retrieve(
	  subscriptionId,
	  { expand: ['customer', 'items.data.price'] },
	  { stripeAccount: stripeAccountId }
	);
  } catch (err) {
	console.error('[Import Subscription] Stripe retrieve error:', err);
	return NextResponse.json({ error: 'Stripe retrieve failed' }, { status: 500 });
  }

  // 5️⃣ Extract the Price ID from the first line item
  const price = subscription.items.data[0]?.price as Stripe.Price;
  if (!price?.id) {
	return NextResponse.json({ error: 'No price on subscription' }, { status: 400 });
  }

  // 6️⃣ Look up the Airtable package by StripePriceId
  const pkgRec = await getSubscriptionPackageByPriceId(price.id);
  if (!pkgRec) {
	return NextResponse.json(
	  { error: `No package found with StripePriceId=${price.id}` },
	  { status: 404 }
	);
  }
  const subscriptionPackageId = pkgRec.id;

  // 7️⃣ Extract customer info
  const cust = subscription.customer as Stripe.Customer;
  const stripeCustomerId = cust.id;
  const email = cust.email ?? '';

  // 8️⃣ Upsert subscriber record in Airtable
  try {
	await upsertSubscriber({
	  subscriptionPackageId,
	  stripeCustomerId,
	  email,
	  status: subscription.status,
	  lastEventAt: subscription.current_period_end
		? new Date(subscription.current_period_end * 1000).toISOString()
		: new Date(subscription.created * 1000).toISOString(),
	});
  } catch (err) {
	console.error('[Import Subscription] Airtable upsertSubscriber error:', err);
	return NextResponse.json({ error: 'Failed to upsert subscriber' }, { status: 500 });
  }

  // 9️⃣ Respond with success
  return NextResponse.json({ success: true });
}
