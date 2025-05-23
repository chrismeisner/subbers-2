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
  const [fields, setFields] = useState<SubscriptionFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
		setFields(pkg.fields as SubscriptionFields);
	  })
	  .catch(err => {
		console.error('[PackageDetailPage] error', err);
		setError(err.message);
	  })
	  .finally(() => {
		setLoading(false);
	  });
  }, [slug]);

  const handleCreateLink = async () => {
	if (!fields) return;
	setCreating(true);
	try {
	  const res = await fetch('/api/subscriptions/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscriptionPackageId: fields.Slug }),
	  });
	  const json = await res.json();
	  if (!res.ok) {
		throw new Error(json.error || 'Failed to create payment link');
	  }
	  const url = json.url as string;
	  setFields(f => f ? { ...f, PaymentLinkURL: url, Status: 'Live' } : f);
	} catch (err: any) {
	  console.error('[PackageDetailPage] create link error', err);
	  alert(err.message);
	} finally {
	  setCreating(false);
	}
  };

  if (loading) {
	return <p className="p-4">Loading subscription details…</p>;
  }
  if (error || !fields) {
	return <p className="p-4 text-red-600">{error || 'Subscription not found.'}</p>;
  }

  return (
	<div className="container mx-auto p-4 bg-white shadow rounded space-y-4">
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

	  {fields.PaymentLinkURL ? (
		<a
		  href={fields.PaymentLinkURL}
		  target="_blank"
		  rel="noopener noreferrer"
		  className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
		>
		  View Payment Link
		</a>
	  ) : (
		<button
		  onClick={handleCreateLink}
		  disabled={creating}
		  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
		>
		  {creating ? 'Creating…' : 'Create Payment Link'}
		</button>
	  )}
	</div>
  );
}
