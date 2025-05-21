// lib/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_CLIENT_ID) {
  throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_CLIENT_ID in environment');
}

// Initialize the Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

// Export your Connect Client ID for building OAuth URLs
export const stripeClientId = process.env.STRIPE_CLIENT_ID!;
