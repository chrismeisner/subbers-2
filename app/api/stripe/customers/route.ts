// File: app/api/stripe/customers/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  // 1️⃣ Ensure the user is signed in
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
    return NextResponse.json({ customers: [], hasMore: false });
  }

  // 2️⃣ Fetch Airtable record and grab the Stripe account ID
  const userRec = await getUserRecord(session.user.id);
  const rawStripe = userRec?.fields.stripeAccountId;
  if (!rawStripe || typeof rawStripe !== "string") {
    return NextResponse.json({ customers: [], hasMore: false });
  }
  const stripeAccountId = rawStripe;

  // 3️⃣ Parse pagination params from the query string
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  const startingAfter = url.searchParams.get("starting_after") || undefined;

  // 4️⃣ Fetch customers from Stripe with pagination
  const list = await stripe.customers.list(
    {
      limit,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    },
    { stripeAccount: stripeAccountId }
  );

  // 5️⃣ Return the page of customers plus a hasMore flag
  const simpleCustomers = list.data.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
  }));
  return NextResponse.json({
    customers: simpleCustomers,
    hasMore: list.has_more,
  });
}
