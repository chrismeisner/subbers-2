// app/api/subscriptions/packages/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getSubscriptionPackages,
  upsertSubscriptionPackage,
  SubscriptionPackages,
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
      // pull the Airtable "Created" timestamp field directly
      createdTime: r.fields.Created as string,
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
  const { recordId, Status, ...rest } = body;

  if (!recordId) {
    return NextResponse.json({ error: 'Missing recordId' }, { status: 400 });
  }

  // 2️⃣ Handle a pure status update (e.g. delete or change status)
  if (Status) {
    try {
      await SubscriptionPackages.update(recordId, { Status });
      return NextResponse.json({ success: true, subscriptionPackage: { id: recordId } });
    } catch (err: any) {
      console.error('[Subscriptions API] POST status update error', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // 3️⃣ Otherwise, full upsert of subscription package
  try {
    const record = await upsertSubscriptionPackage({
      uid,
      recordId: rest.recordId,
      forceCreate: rest.forceCreate,
      meetingTemplateId: rest.meetingTemplateId,
      Title: rest.Title,
      FirstSession: rest.FirstSession,
      Recurring: rest.Recurring,
      Frequency: rest.Frequency,
      RRule: rest.RRule,
      Duration: rest.Duration,
      Price: rest.Price,
      Currency: rest.Currency,
      Interval: rest.Interval,
      TimeZone: rest.TimeZone,
    });

    return NextResponse.json({
      success: true,
      subscriptionPackage: {
        id: record.id,
        fields: record.fields,
      },
    });
  } catch (err: any) {
    console.error('[Subscriptions API] POST upsert error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
