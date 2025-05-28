// app/api/subscriptions/[slug]/meetings/create/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getSubscriptionPackageBySlug,
  createMeetingForPackage,
} from '@/lib/airtable';
import { RRule } from 'rrule';

export async function POST(
  req: Request,
  context: { params: { slug: string } }
) {
  // 1️⃣ Authenticate
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2️⃣ Extract slug and load package
  const { slug } = await context.params;
  const pkg = await getSubscriptionPackageBySlug(slug);
  if (!pkg) {
	return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }
  if (pkg.fields.UID !== userId) {
	return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const f = pkg.fields;

  // 3️⃣ Optional override: if a startsAt is provided in the request body, use it directly
  let nextDate: Date | null = null;
  try {
	const body = await req.json();
	if (body.startsAt) {
	  const overrideDate = new Date(body.startsAt as string);
	  if (isNaN(overrideDate.getTime())) {
		return NextResponse.json({ error: 'Invalid startsAt override' }, { status: 400 });
	  }
	  nextDate = overrideDate;
	}
  } catch {
	// If parsing fails or no body, ignore and proceed to default behavior
  }

  // 4️⃣ Determine next date if no override provided
  if (!nextDate) {
	const now = new Date();
	const firstSess = new Date(f.FirstSession as string);

	if (firstSess > now) {
	  nextDate = firstSess;
	} else if (f.Recurring) {
	  if (f.RRule) {
		const rule = RRule.fromString(f.RRule as string);
		const after = rule.after(now, true);
		if (!after) {
		  return NextResponse.json(
			{ error: 'No further occurrences in RRULE' },
			{ status: 400 }
		  );
		}
		nextDate = after;
	  } else {
		switch (f.Frequency) {
		  case 'Daily':
			nextDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
			break;
		  case 'Weekly':
			nextDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
			break;
		  case 'Monthly':
			nextDate = new Date(now);
			nextDate.setMonth(nextDate.getMonth() + 1);
			break;
		  case 'Yearly':
			nextDate = new Date(now);
			nextDate.setFullYear(nextDate.getFullYear() + 1);
			break;
		  default:
			return NextResponse.json(
			  { error: 'Invalid frequency' },
			  { status: 400 }
			);
		}
	  }
	} else {
	  return NextResponse.json(
		{ error: 'Not a recurring subscription and first session has passed' },
		{ status: 400 }
	  );
	}
  }

  // 5️⃣ Create the meeting record
  const meeting = await createMeetingForPackage(
	pkg.id,
	nextDate.toISOString()
  );

  // 6️⃣ Return the new meeting
  return NextResponse.json({ meeting });
}
