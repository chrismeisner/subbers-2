// app/subscriptions/[slug]/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SubscriptionFields {
  Title: string;
  Slug: string;
  FirstSession: string;
  Recurring: boolean;
  Frequency: string;
  RRule?: string;
  Price: number;
  Currency: string;
  Interval: string;
  Status?: string;
  PaymentLinkURL?: string;
}

interface MeetingRecord {
  id: string;
  fields: {
	StartsAt: string;
	ZoomMeetingId?: string;
	ZoomJoinUrl?: string;
	[key: string]: any;
  };
}

export default function PackageDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [recordId, setRecordId] = useState<string | null>(null);
  const [fields, setFields] = useState<SubscriptionFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creatingLink, setCreatingLink] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);

  // Load subscription package
  useEffect(() => {
	setLoading(true);
	setError(null);

	fetch('/api/subscriptions/packages')
	  .then(res => {
		console.log('[PackageDetailPage] subscription fetch status', res.status);
		if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
		return res.json();
	  })
	  .then((data: { subscriptionPackages: { id: string; fields: any }[] }) => {
		console.log('[PackageDetailPage] subscription data', data);
		const pkg = data.subscriptionPackages.find(p => p.fields.Slug === slug);
		if (!pkg) {
		  throw new Error('Subscription not found');
		}
		setRecordId(pkg.id);
		setFields(pkg.fields as SubscriptionFields);
	  })
	  .catch(err => {
		console.error('[PackageDetailPage] subscription error', err);
		setError(err.message);
	  })
	  .finally(() => {
		setLoading(false);
	  });
  }, [slug]);

  // Load meetings once slug is known
  useEffect(() => {
	if (!slug) return;
	console.log('[PackageDetailPage] fetching meetings for slug:', slug);
	setMeetingsLoading(true);

	fetch(`/api/subscriptions/${slug}/meetings`)
	  .then(res => {
		console.log('[PackageDetailPage] meetings fetch status', res.status);
		if (!res.ok) throw new Error(`Meetings fetch failed: ${res.status}`);
		return res.json();
	  })
	  .then((data: { meetings: MeetingRecord[] }) => {
		console.log('[PackageDetailPage] meetings data', data.meetings);
		setMeetings(data.meetings);
	  })
	  .catch(err => {
		console.error('[PackageDetailPage] meetings error', err);
	  })
	  .finally(() => {
		setMeetingsLoading(false);
	  });
  }, [slug]);

  const handleCreateLink = async () => {
	if (!recordId) return;
	setCreatingLink(true);
	try {
	  const res = await fetch('/api/subscriptions/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscriptionPackageId: recordId }),
	  });
	  const json = await res.json();
	  console.log('[PackageDetailPage] create link response', json);
	  if (!res.ok) throw new Error(json.error || 'Failed to create payment link');
	  setFields(f =>
		f ? { ...f, PaymentLinkURL: json.url, Status: 'Live' } : f
	  );
	} catch (err: any) {
	  console.error('[PackageDetailPage] create link error', err);
	  alert(err.message);
	} finally {
	  setCreatingLink(false);
	}
  };

  const handleCreateNext = async () => {
	if (!slug) return;
	setCreatingEvent(true);
	console.log('[PackageDetailPage] creating next event for slug:', slug);
	try {
	  const res = await fetch(`/api/subscriptions/${slug}/meetings/create`, {
		method: 'POST',
	  });
	  const json = await res.json();
	  console.log('[PackageDetailPage] create event response', json);
	  if (!res.ok) throw new Error(json.error || 'Failed to create next event');
	  // Refresh meetings list
	  const mRes = await fetch(`/api/subscriptions/${slug}/meetings`);
	  const mJson = await mRes.json();
	  console.log('[PackageDetailPage] refreshed meetings', mJson.meetings);
	  setMeetings(mJson.meetings);
	} catch (err: any) {
	  console.error('[PackageDetailPage] create event error', err);
	  alert(err.message);
	} finally {
	  setCreatingEvent(false);
	}
  };

  if (loading) {
	return <p className="p-4">Loading subscription details…</p>;
  }
  if (error || !fields) {
	return <p className="p-4 text-red-600">{error || 'Subscription not found.'}</p>;
  }

  // Determine next upcoming meeting
  const nextMeeting = meetings.find(
	m => new Date(m.fields.StartsAt) > new Date()
  );

  return (
	<div className="container mx-auto p-4 bg-white shadow rounded space-y-6">
	  <div className="flex items-center justify-between">
		<h1 className="text-2xl font-bold">{fields.Title}</h1>
		<Link
		  href={`/subscriptions/${slug}/edit`}
		  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
		>
		  Edit Subscription
		</Link>
	  </div>

	  <ul className="list-disc list-inside space-y-1">
		<li>
		  <strong>First Session:</strong>{' '}
		  {new Date(fields.FirstSession).toLocaleString()}
		</li>
		<li>
		  <strong>Recurring:</strong> {fields.Recurring ? 'Yes' : 'No'}
		</li>
		<li>
		  <strong>Frequency:</strong> {fields.Frequency}
		</li>
		{fields.RRule && (
		  <li>
			<strong>RRULE:</strong> {fields.RRule}
		  </li>
		)}
		<li>
		  <strong>Price:</strong>{' '}
		  {new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: fields.Currency,
		  }).format(fields.Price / 100)}
		</li>
		<li>
		  <strong>Interval:</strong> {fields.Interval}
		</li>
		<li>
		  <strong>Status:</strong> {fields.Status ?? 'Draft'}
		</li>
	  </ul>

	  <div className="flex space-x-4">
		{fields.PaymentLinkURL ? (
		  <a
			href={fields.PaymentLinkURL}
			target="_blank"
			rel="noopener noreferrer"
			className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
		  >
			View Payment Link
		  </a>
		) : (
		  <button
			onClick={handleCreateLink}
			disabled={creatingLink}
			className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
		  >
			{creatingLink ? 'Creating…' : 'Create Payment Link'}
		  </button>
		)}

		<button
		  onClick={handleCreateNext}
		  disabled={creatingEvent}
		  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
		>
		  {creatingEvent ? 'Creating…' : 'Create Next Event'}
		</button>
	  </div>

	  <section>
		<h2 className="text-xl font-semibold">Next Upcoming Meeting</h2>
		{meetingsLoading ? (
		  <p>Loading meetings…</p>
		) : nextMeeting ? (
		  <table className="min-w-full table-auto">
			<thead>
			  <tr className="bg-gray-100">
				<th className="px-3 py-2 text-left">Starts At</th>
				<th className="px-3 py-2 text-left">Zoom Link</th>
			  </tr>
			</thead>
			<tbody>
			  <tr className="border-t">
				<td className="px-3 py-2">
				  {new Date(nextMeeting.fields.StartsAt).toLocaleString()}
				</td>
				<td className="px-3 py-2">
				  {nextMeeting.fields.ZoomJoinUrl ? (
					<a
					  href={nextMeeting.fields.ZoomJoinUrl}
					  target="_blank"
					  rel="noopener noreferrer"
					  className="text-blue-600 hover:underline"
					>
					  Join Meeting
					</a>
				  ) : (
					<span className="text-gray-600">Not available</span>
				  )}
				</td>
			  </tr>
			</tbody>
		  </table>
		) : (
		  <p>No upcoming meetings scheduled.</p>
		)}
	  </section>
	</div>
  );
}
