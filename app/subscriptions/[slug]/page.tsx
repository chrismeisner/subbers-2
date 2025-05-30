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

export default function PackageDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [recordId, setRecordId] = useState<string | null>(null);
  const [fields, setFields] = useState<SubscriptionFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creatingLink, setCreatingLink] = useState(false);
  const [schedulingNext, setSchedulingNext] = useState(false);

  // Load subscription package
  useEffect(() => {
	setLoading(true);
	setError(null);

	fetch('/api/subscriptions/packages')
	  .then(res => {
		if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
		return res.json();
	  })
	  .then((data: { subscriptionPackages: { id: string; fields: any }[] }) => {
		const pkg = data.subscriptionPackages.find(p => p.fields.Slug === slug);
		if (!pkg) {
		  throw new Error('Subscription not found');
		}
		setRecordId(pkg.id);
		setFields(pkg.fields as SubscriptionFields);
	  })
	  .catch(err => {
		setError(err.message);
	  })
	  .finally(() => setLoading(false));
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
	  if (!res.ok) throw new Error(json.error || 'Failed to create payment link');
	  setFields(f => f ? { ...f, PaymentLinkURL: json.url, Status: 'Live' } : f);
	} catch (err: any) {
	  alert(err.message);
	} finally {
	  setCreatingLink(false);
	}
  };

  const handleScheduleNext = async () => {
	if (!recordId) return;
	setSchedulingNext(true);
	try {
	  const res = await fetch(`/api/scheduler/run/${recordId}`, {
		method: 'POST',
	  });
	  const json = await res.json();
	  if (!res.ok) throw new Error(json.error || 'Failed to schedule next meeting');
	  // Optionally refresh or notify
	  alert('Next meeting scheduled successfully.');
	} catch (err: any) {
	  alert(err.message);
	} finally {
	  setSchedulingNext(false);
	}
  };

  if (loading) return <p className="p-4">Loading subscription details…</p>;
  if (error || !fields) return <p className="p-4 text-red-600">{error || 'Subscription not found.'}</p>;

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
		  <strong>First Session:</strong> {new Date(fields.FirstSession).toLocaleString()}
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
		  onClick={handleScheduleNext}
		  disabled={schedulingNext}
		  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
		>
		  {schedulingNext ? 'Scheduling…' : 'Schedule Next Event'}
		</button>
	  </div>
	</div>
  );
}
