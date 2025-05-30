// File: app/api/subscriptions/confirm/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRecord, SubscriptionPackages, createMeetingForPackage } from '@/lib/airtable';
import { stripe } from '@/lib/stripe';

/**
 * Map our Interval values to Stripe’s required singular intervals.
 */
function mapInterval(iv: string): 'day' | 'week' | 'month' | 'year' {
  switch (iv) {
    case 'Daily':
      return 'day';
    case 'Weekly':
      return 'week';
    case 'Monthly':
      return 'month';
    case 'Yearly':
      return 'year';
    default:
      throw new Error(`Unsupported interval: ${iv}`);
  }
}

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
  } catch {
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
  const priceParams: any = {
    unit_amount: pkgFields.Price as number,
    currency: pkgFields.Currency as string,
    product: product.id,
  };

  if (pkgFields.Interval && pkgFields.Interval !== 'One-off') {
    priceParams.recurring = {
      interval: mapInterval(pkgFields.Interval as string),
    };
  }

  const price = await stripe.prices.create(priceParams, { stripeAccount });

  // 7️⃣ Create a Stripe Payment Link
  //    ← here we add the subscriptionPackageId into metadata
  const paymentLink = await stripe.paymentLinks.create(
    {
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { subscriptionPackageId },
    },
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

  // 8.1️⃣ Create the first Meeting record in Airtable
  const firstSession = pkgFields.FirstSession as string | undefined;
  if (firstSession) {
    try {
      await createMeetingForPackage(subscriptionPackageId, firstSession);
    } catch (err) {
      console.error(
        `[Confirm] failed to create first meeting for ${subscriptionPackageId}:`,
        err
      );
    }
  }

  // 9️⃣ Respond with the newly created payment link URL
  return NextResponse.json({ url: paymentLink.url });
}
