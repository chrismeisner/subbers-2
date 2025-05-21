// app/api/zoom/connect/callback/route.ts

import { NextResponse } from "next/server";
import { exchangeZoomCodeForTokens } from "@/lib/zoom";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserRecord, Users } from "@/lib/airtable";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const code = url.searchParams.get("code");
  if (!code) {
	console.error("[Zoom Callback] no code in query");
	return NextResponse.redirect(`${origin}/dashboard?error=zoom_oauth_failed`);
  }

  // Exchange the code for access & refresh tokens
  let tokens;
  try {
	tokens = await exchangeZoomCodeForTokens(
	  code,
	  `${origin}/api/zoom/connect/callback`
	);
  } catch (err) {
	console.error("[Zoom Callback] token exchange error:", err);
	return NextResponse.redirect(`${origin}/dashboard?error=zoom_oauth_failed`);
  }

  // Ensure user is authenticated
  const session = await getServerSession(authOptions);
  if (!session) {
	console.error("[Zoom Callback] no valid session");
	return NextResponse.redirect(`${origin}/login`);
  }
  const uid = session.user.id;

  // Persist tokens in Airtable user record
  const userRec = await getUserRecord(uid);
  if (userRec) {
	await Users.update(userRec.id, {
	  zoomAccessToken: tokens.access_token,
	  zoomRefreshToken: tokens.refresh_token,
	});
	console.log("[Zoom Callback] updated Airtable record", userRec.id);
  } else {
	console.warn("[Zoom Callback] no Airtable user record for UID:", uid);
  }

  // Redirect back to dashboard
  return NextResponse.redirect(`${origin}/dashboard`);
}
