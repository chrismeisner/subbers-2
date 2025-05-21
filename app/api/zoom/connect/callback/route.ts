// File: app/api/zoom/connect/callback/route.ts

import { NextResponse } from "next/server";
import { exchangeZoomCodeForTokens, getZoomOAuthAuthorizeUrl } from "@/lib/zoom";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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

  // Ensure user is authenticated (cast so TS knows .user exists)
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
    console.error("[Zoom Callback] no valid session");
    return NextResponse.redirect(`${origin}/login`);
  }
  const uid = session.user.id;
  if (!uid) {
    console.error("[Zoom Callback] session.user.id missing");
    return NextResponse.redirect(`${origin}/login`);
  }

  // Persist tokens in Airtable user record
  const userRec = await getUserRecord(uid);
  if (userRec) {
    await Users.update(userRec.id, {
      zoomAccessToken: tokens.access_token as any,
      zoomRefreshToken: tokens.refresh_token as any,
    });
    console.log("[Zoom Callback] updated Airtable record", userRec.id);
  } else {
    console.warn("[Zoom Callback] no Airtable user record for UID:", uid);
  }

  // Redirect back to dashboard
  return NextResponse.redirect(`${origin}/dashboard`);
}
