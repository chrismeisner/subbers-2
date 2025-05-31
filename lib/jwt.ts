// File: lib/jwt.ts

import jwt from "jsonwebtoken";

const SECRET = process.env.PORTAL_TOKEN_SECRET!;
if (!SECRET) {
  throw new Error("Missing PORTAL_TOKEN_SECRET in your environment");
}

/**
 * Create a portal‐token (JWT) that encodes { uid } and expires in 7 days.
 */
export function createPortalToken(uid: string): string {
  return jwt.sign({ uid }, SECRET, { expiresIn: "7d" });
}

/**
 * Verify a portal‐token. Throws if invalid or expired.
 * Returns an object { uid: string } on success.
 */
export function verifyPortalToken(token: string): { uid: string } {
  return jwt.verify(token, SECRET) as { uid: string };
}
