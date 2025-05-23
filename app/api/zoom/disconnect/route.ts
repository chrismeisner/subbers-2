// File: app/api/zoom/disconnect/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRecord, Users } from "@/lib/airtable";

export async function GET() {
  // Cast session to any so TS knows `.user.id` exists
  const session = (await getServerSession(authOptions)) as any;
  if (session) {
	const rec = await getUserRecord(session.user.id);
	if (rec) {
	  // Cast null to any so TS allows clearing these fields
	  await Users.update(rec.id, {
		zoomAccessToken: null as any,
		zoomRefreshToken: null as any,
	  });
	}
  }
  return NextResponse.redirect("/dashboard");
}
