// app/api/subscriptions/confirm/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import Stripe from 'stripe';
import { authOptions } from '@/lib/auth';
import { getUserRecord, SubscriptionPackages } from '@/lib/airtable';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: Request) {
  // 1️⃣ Authenticate
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const uid = session.user.id;

  // 2️⃣ Parse request
  const { subscriptionPackageId } = await req.json();
  if (!subscriptionPackageId) {
	return NextResponse.json({ error: 'Missing subscriptionPackageId' }, { status: 400 });
  }

  // 3️⃣ Load Airtable data
  const pkgRecord = await SubscriptionPackages.find(subscriptionPackageId);
  const pkgFields = pkgRecord.fields;
  const userRec = await getUserRecord(uid);
  const stripeAccount = userRec?.fields.stripeAccountId as string;
  if (!stripeAccount) {
	return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 });
  }

  // 4️⃣ Create Stripe Product
  const product = await stripe.products.create(
	{ name: pkgFields.Title as string },
	{ stripeAccount }
  );

  // 5️⃣ Create Stripe Price
  const price = await stripe.prices.create(
	{
	  unit_amount: pkgFields.Price as number,
	  currency: pkgFields.Currency as string,
	  recurring:
		pkgFields.Interval !== 'One-off'
		  ? { interval: (pkgFields.Interval as string).toLowerCase() as 'monthly' | 'yearly' }
		  : undefined,
	  product: product.id,
	},
	{ stripeAccount }
  );

  // 6️⃣ Create Stripe Payment Link
  const paymentLink = await stripe.paymentLinks.create(
	{ line_items: [{ price: price.id, quantity: 1 }] },
	{ stripeAccount }
  );

  // 7️⃣ Persist back into Airtable
  await SubscriptionPackages.update(subscriptionPackageId, {
	StripeProductId: product.id,
	StripePriceId:   price.id,
	PaymentLinkId:   paymentLink.id,
	PaymentLinkURL:  paymentLink.url,
  });

  // 8️⃣ Respond with the payment link URL
  return NextResponse.json({ url: paymentLink.url });
}
