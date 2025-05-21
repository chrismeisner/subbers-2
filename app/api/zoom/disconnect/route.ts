// File: app/api/zoom/disconnect/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserRecord, Users } from "@/lib/airtable";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session) {
	const rec = await getUserRecord(session.user.id);
	if (rec) {
	  await Users.update(rec.id, {
		zoomAccessToken: null,
		zoomRefreshToken: null,
	  });
	}
  }
  return NextResponse.redirect("/dashboard");
}
