// File: app/api/stripe/connect/callback/route.ts

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${origin}/dashboard?error=stripe_oauth_failed`
    );
  }

  let tokenResponse;
  try {
    tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
  } catch (err) {
    console.error("⚠️ stripe.oauth.token threw:", err);
    return NextResponse.redirect(
      `${origin}/dashboard?error=stripe_oauth_failed`
    );
  }

  const stripeAccountId = tokenResponse.stripe_user_id;
  const session = await getServerSession(authOptions);
  // Guard against session.user being undefined
  if (!session || !session.user?.id) {
    return NextResponse.redirect(`${origin}/login`);
  }
  const uid = session.user.id;

  const userRec = await getUserRecord(uid);
  if (userRec) {
    await Users.update(userRec.id, { stripeAccountId });
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
