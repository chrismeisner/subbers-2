// app/api/scheduler/run/[slug]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { scheduleNextMeetingForPackage } from '@/lib/scheduler';

export async function POST(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  // 1️⃣ Auth
  const session = await getServerSession(authOptions);
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2️⃣ Await params and extract slug
  const { slug: pkgId } = await context.params;

  try {
	await scheduleNextMeetingForPackage(pkgId);
	return NextResponse.json({ success: true });
  } catch (err: any) {
	console.error(
	  `[Scheduler API] scheduleNextMeetingForPackage failed for ${pkgId}:`,
	  err
	);
	return NextResponse.json(
	  { error: err.message || 'Internal error' },
	  { status: 500 }
	);
  }
}
