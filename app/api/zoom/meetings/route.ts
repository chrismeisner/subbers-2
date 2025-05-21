// File: app/api/zoom/meetings/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";
import { refreshZoomTokens } from "@/lib/zoom";

export async function GET(req: Request) {
  // 1️⃣ Validate session
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ meetings: [] });
  }

  // 2️⃣ Load Airtable record
  const userRec = await getUserRecord(session.user.id);
  const rawZoom = userRec?.fields.zoomAccessToken;
  const rawRefresh = userRec?.fields.zoomRefreshToken;
  if (
	!rawZoom ||
	typeof rawZoom !== "string" ||
	!rawRefresh ||
	typeof rawRefresh !== "string"
  ) {
	return NextResponse.json({ meetings: [] });
  }

  // 3️⃣ Fetch upcoming meetings, refreshing token on 401
  let accessToken = rawZoom;
  const meetingsUrl = "https://api.zoom.us/v2/users/me/meetings?type=upcoming";
  let res = await fetch(meetingsUrl, {
	headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
	console.log("[Zoom Meetings] access token expired, refreshing tokens");
	try {
	  const tokens = await refreshZoomTokens(rawRefresh);
	  await Users.update(userRec.id, {
		zoomAccessToken: tokens.access_token,
		zoomRefreshToken: tokens.refresh_token,
	  });
	  console.log("[Zoom Meetings] persisted refreshed Zoom tokens");
	  accessToken = tokens.access_token;
	  res = await fetch(meetingsUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	  });
	} catch (err) {
	  console.error("[Zoom Meetings] token refresh error:", err);
	  return NextResponse.json({ meetings: [] });
	}
  }

  if (!res.ok) {
	throw new Error(`Zoom API error: ${res.status}`);
  }

  const data = await res.json();
  const meetings = (data.meetings || []).map((m: any) => ({
	id: m.id,
	topic: m.topic,
	start_time: m.start_time,
  }));

  return NextResponse.json({ meetings });
}
