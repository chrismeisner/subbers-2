// lib/zoom.ts
const clientId = process.env.ZOOM_CLIENT_ID!;
const clientSecret = process.env.ZOOM_CLIENT_SECRET!;
const tokenUrl = 'https://zoom.us/oauth/token';
const authorizeUrl = 'https://zoom.us/oauth/authorize';
const profileUrl = 'https://api.zoom.us/v2/users/me';

/**
 * Build the Zoom OAuth authorize URL.
 */
export function getZoomOAuthAuthorizeUrl(origin: string): string {
  const redirectUri = encodeURIComponent(`${origin}/api/zoom/connect/callback`);
  return `${authorizeUrl}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
}

/**
 * Exchange an OAuth code for access and refresh tokens.
 */
export async function exchangeZoomCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string }> {
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const params = new URLSearchParams({
	grant_type: 'authorization_code',
	code,
	redirect_uri: redirectUri,
  });

  const res = await fetch(`${tokenUrl}?${params.toString()}`, {
	method: 'POST',
	headers: {
	  Authorization: `Basic ${creds}`,
	  'Content-Type': 'application/x-www-form-urlencoded',
	},
  });

  if (!res.ok) {
	const err = await res.text();
	throw new Error(`Zoom token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Fetch the authenticated user's Zoom profile.
 */
export async function getZoomUserProfile(
  accessToken: string
): Promise<{ id: string; email?: string }> {
  const res = await fetch(profileUrl, {
	headers: {
	  Authorization: `Bearer ${accessToken}`,
	},
  });
  if (!res.ok) {
	const err = await res.text();
	throw new Error(`Zoom profile fetch failed: ${err}`);
  }
  const data = await res.json();
  return { id: data.id, email: data.email };
}
