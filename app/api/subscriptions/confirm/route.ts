// app/api/subscriptions/confirm/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRecord, SubscriptionPackages } from '@/lib/airtable';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  // 1️⃣ Authenticate user
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const uid = session.user.id;

  // 2️⃣ Parse request body
  const { subscriptionPackageId } = await req.json();
  if (!subscriptionPackageId) {
	return NextResponse.json({ error: 'Missing subscriptionPackageId' }, { status: 400 });
  }

  // 3️⃣ Load the SubscriptionPackage record
  let pkgRecord;
  try {
	pkgRecord = await SubscriptionPackages.find(subscriptionPackageId);
  } catch (err) {
	return NextResponse.json({ error: 'Subscription package not found' }, { status: 404 });
  }
  const pkgFields = pkgRecord.fields;

  // 4️⃣ Ensure Stripe account is connected
  const userRec = await getUserRecord(uid);
  const stripeAccount = userRec?.fields.stripeAccountId as string;
  if (!stripeAccount) {
	return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 });
  }

  // 5️⃣ Create a Stripe Product
  const product = await stripe.products.create(
	{ name: pkgFields.Title as string },
	{ stripeAccount }
  );

  // 6️⃣ Create a Stripe Price
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

  // 7️⃣ Create a Stripe Payment Link
  const paymentLink = await stripe.paymentLinks.create(
	{ line_items: [{ price: price.id, quantity: 1 }] },
	{ stripeAccount }
  );

  // 8️⃣ Persist back into Airtable (mark Live, save Stripe IDs & URL)
  await SubscriptionPackages.update(subscriptionPackageId, {
	StripeProductId: product.id,
	StripePriceId: price.id,
	PaymentLinkId: paymentLink.id,
	PaymentLinkURL: paymentLink.url,
	Status: 'Live',
  });

  // 9️⃣ Respond with the newly created payment link URL
  return NextResponse.json({ url: paymentLink.url });
}
