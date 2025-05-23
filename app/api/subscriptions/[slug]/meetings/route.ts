// app/api/subscriptions/[slug]/meetings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSubscriptionPackageBySlug, getMeetingsForPackage } from '@/lib/airtable';

export async function GET(
  req: Request,
  context: { params: { slug: string } }
) {
  // 1️⃣ Authenticate
  const session = (await getServerSession(authOptions)) as any;
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2️⃣ Extract slug
  const { slug } = await context.params;

  // 3️⃣ Load the package and authorize
  const pkg = await getSubscriptionPackageBySlug(slug);
  if (!pkg) {
	return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }
  if (pkg.fields.UID !== userId) {
	return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4️⃣ Fetch only this user's meetings for that package
  const records = await getMeetingsForPackage(pkg.id, userId);
  const meetings = records.map(r => ({ id: r.id, fields: r.fields }));

  // 5️⃣ Return
  return NextResponse.json({ meetings });
}
