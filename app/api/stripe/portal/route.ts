// File: app/api/stripe/portal/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRecord } from '@/lib/airtable';
import { stripe } from '@/lib/stripe';

export async function GET(req: Request) {
  // 1️⃣ Authenticate user
  const session = await getServerSession(authOptions);
  if (!session) {
	return NextResponse.json({ url: null }, { status: 401 });
  }

  // 2️⃣ Look up connected Stripe account and stored customer ID
  const userRec = await getUserRecord(session.user.id);
  const stripeAccountId = userRec?.fields.stripeAccountId as string | undefined;
  const customerId      = userRec?.fields.stripeCustomerId as string | undefined;
  if (!stripeAccountId || !customerId) {
	return NextResponse.json({ url: null }, { status: 400 });
  }

  // 3️⃣ Create a Customer Portal session
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const portalSession = await stripe.billingPortal.sessions.create(
	{
	  customer:    customerId,
	  return_url:  `${origin}/dashboard`,
	},
	{ stripeAccount: stripeAccountId }
  );

  // 4️⃣ Return the one-time portal URL
  return NextResponse.json({ url: portalSession.url });
}
