// File: app/api/user/status/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";
import { getZoomUserProfile } from "@/lib/zoom";

export async function GET(req: Request) {
  // 1️⃣ Check session (cast to any so TS knows .user exists)
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({
	  stripeConnected: false,
	  zoomConnected: false,
	  stripeAccountId: null,
	  zoomUserEmail: null,
	});
  }

  // 2️⃣ Load Airtable user
  const uid = session.user.id;
  const userRec = await getUserRecord(uid);
  if (!userRec) {
	return NextResponse.json({
	  stripeConnected: false,
	  zoomConnected: false,
	  stripeAccountId: null,
	  zoomUserEmail: null,
	});
  }

  // 3️⃣ Determine connection flags
  const rawStripe = userRec.fields.stripeAccountId;
  const rawZoom = userRec.fields.zoomAccessToken;
  const stripeConnected = Boolean(rawStripe);
  let zoomConnected = Boolean(rawZoom);
  let zoomUserEmail: string | null = null;

  // 4️⃣ If Zoom token exists and is a string, verify and fetch email
  if (zoomConnected && typeof rawZoom === "string") {
	try {
	  const profile = await getZoomUserProfile(rawZoom);
	  zoomUserEmail = profile.email || null;
	} catch (err) {
	  console.error("Zoom profile fetch error:", err);
	  zoomConnected = false;
	}
  }

  // 5️⃣ Respond
  return NextResponse.json({
	stripeConnected,
	zoomConnected,
	stripeAccountId: stripeConnected ? rawStripe : null,
	zoomUserEmail,
  });
}
