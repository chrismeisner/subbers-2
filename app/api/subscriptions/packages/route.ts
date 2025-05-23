// app/api/subscriptions/packages/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getSubscriptionPackages,
  upsertSubscriptionPackage,
} from '@/lib/airtable';

export async function GET() {
  // 1️⃣ Require an authenticated session
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
    return NextResponse.json({ subscriptionPackages: [] });
  }

  // 2️⃣ Load all packages for this user
  const uid = session.user.id;
  try {
    const records = await getSubscriptionPackages(uid);
    const subscriptionPackages = records.map(r => ({
      id: r.id,
      fields: r.fields,
    }));
    return NextResponse.json({ subscriptionPackages });
  } catch (err: any) {
    console.error('[Subscriptions API] GET error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 1️⃣ Require an authenticated session
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uid = session.user.id;
  const body = await req.json();

  try {
    const record = await upsertSubscriptionPackage({
      uid,
      recordId: body.recordId,
      forceCreate: body.forceCreate,
      meetingTemplateId: body.meetingTemplateId,
      Title: body.Title,
      FirstSession: body.FirstSession,
      Recurring: body.Recurring,
      Frequency: body.Frequency,
      RRule: body.RRule,
      Price: body.Price,
      Currency: body.Currency,
      Interval: body.Interval,
    });

    return NextResponse.json({
      success: true,
      subscriptionPackage: {
        id: record.id,
        fields: record.fields,
      },
    });
  } catch (err: any) {
    console.error('[Subscriptions API] POST error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
