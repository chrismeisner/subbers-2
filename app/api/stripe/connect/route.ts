import { NextResponse } from "next/server";
import { stripeClientId } from "@/lib/stripe";

export function GET(req: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const params = new URLSearchParams({
	response_type: "code",
	client_id: stripeClientId,
	scope: "read_write",
	redirect_uri: `${origin}/api/stripe/connect/callback`,
  });
  return NextResponse.redirect(
	`https://connect.stripe.com/oauth/v2/authorize?${params.toString()}`
  );
}
