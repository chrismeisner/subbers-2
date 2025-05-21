// File: app/api/user/status/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";
import { getZoomUserProfile } from "@/lib/zoom";

export async function GET(req: Request) {
  // 1️⃣ Get the NextAuth session
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	console.log("[UserStatus] no session, returning unauthenticated status");
	return NextResponse.json({
	  stripeConnected: false,
	  stripeAccountId: null,
	  stripeAccountBalance: null,
	  zoomConnected: false,
	  zoomUserEmail: null,
	});
  }

  // 2️⃣ Look up the user record in Airtable
  const uid = session.user.id;
  console.log(`[UserStatus] fetched session, uid=${uid}`);
  const userRec = await getUserRecord(uid);
  if (!userRec) {
	console.log(`[UserStatus] no Airtable record for uid=${uid}`);
	return NextResponse.json({
	  stripeConnected: false,
	  stripeAccountId: null,
	  stripeAccountBalance: null,
	  zoomConnected: false,
	  zoomUserEmail: null,
	});
  }

  // 3️⃣ Stripe connection and balance
  const rawStripe = userRec.fields.stripeAccountId;
  const stripeConnected = Boolean(rawStripe);
  let stripeAccountBalance: { amount: number; currency: string } | null = null;
  if (stripeConnected && typeof rawStripe === "string") {
	console.log(`[UserStatus] stripeConnected → accountId=${rawStripe}`);
	try {
	  const balance = await stripe.balance.retrieve(
		{},
		{ stripeAccount: rawStripe }
	  );
	  if (balance.available.length > 0) {
		const { amount, currency } = balance.available[0];
		stripeAccountBalance = { amount, currency };
		console.log(
		  `[UserStatus] stripeAccountBalance=${amount} ${currency}`
		);
	  } else {
		console.log("[UserStatus] no available balance entries");
	  }
	} catch (err) {
	  console.error("[UserStatus] failed to fetch Stripe balance:", err);
	}
  } else {
	console.log("[UserStatus] stripe not connected or invalid accountId");
  }

  // 4️⃣ Zoom connection and email (with automatic refresh)
  const rawZoom = userRec.fields.zoomAccessToken;
  const rawRefresh = userRec.fields.zoomRefreshToken;
  const zoomConnected = Boolean(rawZoom && rawRefresh);
  let zoomUserEmail: string | null = null;
  if (
	zoomConnected &&
	typeof rawZoom === "string" &&
	typeof rawRefresh === "string"
  ) {
	console.log("[UserStatus] zoomConnected → fetching Zoom profile");
	try {
	  const profile = await getZoomUserProfile(
		rawZoom,
		rawRefresh,
		async (newAccess, newRefresh) => {
		  await Users.update(userRec.id, {
			zoomAccessToken: newAccess,
			zoomRefreshToken: newRefresh,
		  });
		  console.log("[UserStatus] persisted refreshed Zoom tokens");
		}
	  );
	  zoomUserEmail = profile.email || null;
	  console.log(`[UserStatus] zoomUserEmail=${zoomUserEmail}`);
	} catch (err) {
	  console.error("[UserStatus] Zoom profile error after refresh:", err);
	}
  } else {
	console.log("[UserStatus] zoom not connected or invalid tokens");
  }

  // 5️⃣ Respond with aggregated status
  return NextResponse.json({
	stripeConnected,
	stripeAccountId: stripeConnected && typeof rawStripe === "string" ? rawStripe : null,
	stripeAccountBalance,
	zoomConnected,
	zoomUserEmail,
  });
}
