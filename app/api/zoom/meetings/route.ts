// File: app/api/zoom/meetings/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord } from "@/lib/airtable";

export async function GET(request: Request) {
  // 1️⃣ Ensure the user is signed in (cast to any so TS knows .user exists)
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ meetings: [] });
  }

  // 2️⃣ Look up their Airtable record to get the Zoom token
  const userRec = await getUserRecord(session.user.id);
  const rawZoom = userRec?.fields.zoomAccessToken;
  if (!rawZoom || typeof rawZoom !== "string") {
	return NextResponse.json({ meetings: [] });
  }

  // 3️⃣ Call Zoom’s “list upcoming meetings” endpoint
  try {
	const res = await fetch(
	  "https://api.zoom.us/v2/users/me/meetings?type=upcoming",
	  {
		headers: { Authorization: `Bearer ${rawZoom}` },
	  }
	);
	if (!res.ok) throw new Error(`Zoom API error: ${res.status}`);
	const data = await res.json();
	// 4️⃣ Pull out only the fields we care about
	const meetings = (data.meetings || []).map((m: any) => ({
	  id: m.id,
	  topic: m.topic,
	  start_time: m.start_time,
	}));
	return NextResponse.json({ meetings });
  } catch (err) {
	console.error("[Zoom Meetings]", err);
	return NextResponse.json({ meetings: [] });
  }
}
