// File: app/api/stripe/webhook/route.ts

import { NextResponse } from 'next/server';
import type { Stripe } from 'stripe';
import { stripe } from '@/lib/stripe';
import { createStripeEvent } from '@/lib/airtable';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
	event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
	console.error('[Stripe Webhook] signature verification failed:', err);
	return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Only handle checkout sessions and invoice payments for live subscriptions
  const relevantEvents = ['checkout.session.completed', 'invoice.payment_succeeded'];
  if (relevantEvents.includes(event.type)) {
	const obj = event.data.object as any;
	const pkgId = obj.metadata?.subscriptionPackageId;
	if (pkgId) {
	  try {
		await createStripeEvent({
		  eventId: event.id,
		  type: event.type,
		  createdAt: new Date(event.created * 1000).toISOString(),
		  subscriptionPackageId: pkgId,
		  stripeCustomerId: obj.customer,
		  amount: obj.amount_total ?? obj.amount,
		  currency: obj.currency,
		  rawPayload: JSON.stringify(event),
		});
	  } catch (err) {
		console.error('[Stripe Webhook] failed to create StripeEvent record:', err);
	  }
	}
  }

  return NextResponse.json({ received: true });
}
