// app/api/scheduler/run/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { scheduleNextMeetings } from '@/lib/scheduler';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
	await scheduleNextMeetings();
	return NextResponse.json({ success: true });
  } catch (err: any) {
	console.error('[Scheduler API] scheduleNextMeetings failed:', err);
	return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
