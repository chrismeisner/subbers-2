// File: lib/stripe.ts

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_CLIENT_ID) {
  throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_CLIENT_ID in environment');
}

// Use the Stripe API version supported by your installed stripe package
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// Export your Connect Client ID for building OAuth URLs
export const stripeClientId = process.env.STRIPE_CLIENT_ID!;
