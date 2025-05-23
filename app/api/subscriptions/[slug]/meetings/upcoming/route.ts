// app/api/subscriptions/[slug]/meetings/upcoming/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getSubscriptionPackageBySlug,
  getNextMeetingForPackage,
} from '@/lib/airtable';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // 1️⃣ Authenticate
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ meeting: null });
  }
  const uid = session.user.id;

  // 2️⃣ Await your params, then load & authorize the subscription
  const { slug } = await params;
  const pkg = await getSubscriptionPackageBySlug(slug);
  if (!pkg || pkg.fields.UID !== uid) {
	return NextResponse.json({ meeting: null }, { status: 404 });
  }

  // 3️⃣ Fetch exactly one “next” meeting
  const nextRec = await getNextMeetingForPackage(pkg.id, uid);
  if (!nextRec) {
	return NextResponse.json({ meeting: null });
  }

  // 4️⃣ Return it
  return NextResponse.json({
	meeting: { id: nextRec.id, fields: nextRec.fields },
  });
}
