// app/api/zoom/connect/route.ts

import { NextResponse } from "next/server";
import { getZoomOAuthAuthorizeUrl } from "@/lib/zoom";

export function GET(req: Request) {
  // Determine the redirect URI base (uses NEXT_PUBLIC_APP_URL or fallback to request origin)
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  // Build the Zoom OAuth authorization URL
  const authorizationUrl = getZoomOAuthAuthorizeUrl(origin);

  // Redirect the user to Zoom's OAuth consent page
  return NextResponse.redirect(authorizationUrl);
}
