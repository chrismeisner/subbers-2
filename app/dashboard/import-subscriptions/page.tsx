'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Subscription {
  id: string;
  customer: string;
  customer_email: string | null;
  status: string;
  current_period_end: number; // Unix timestamp
  priceId: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  imported?: boolean;
}

export default function ImportSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
	async function fetchSubscriptions() {
	  try {
		const res = await fetch('/api/stripe/subscriptions/list');
		if (!res.ok) throw new Error(`Error fetching: ${res.status}`);
		const data = await res.json();
		setSubscriptions(data.subscriptions);
	  } catch (err: any) {
		console.error('[ImportSubscriptions] fetch error', err);
		setError('Failed to load subscriptions.');
	  } finally {
		setLoading(false);
	  }
	}
	fetchSubscriptions();
  }, []);

  const handleImport = async (subscriptionId: string) => {
	setImporting(prev => ({ ...prev, [subscriptionId]: true }));
	try {
	  const res = await fetch('/api/stripe/import-subscription', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscriptionId }),
	  });
	  if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || 'Import failed');
	  }
	  setSubscriptions(subs =>
		subs.map(s =>
		  s.id === subscriptionId ? { ...s, imported: true } : s
		)
	  );
	} catch (err: any) {
	  console.error('[ImportSubscriptions] import error', err);
	  alert(err.message || 'Failed to import subscription.');
	} finally {
	  setImporting(prev => ({ ...prev, [subscriptionId]: false }));
	}
  };

  if (loading) {
	return <p className="p-4">Loading subscriptions…</p>;
  }

  if (error) {
	return <p className="p-4 text-red-600">{error}</p>;
  }

  return (
	<div className="container mx-auto p-4 space-y-4">
	  <div className="flex items-center justify-between">
		<h1 className="text-2xl font-bold">Import Subscriptions</h1>
		<Link
		  href="/dashboard"
		  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
		>
		  Back to Dashboard
		</Link>
	  </div>

	  {subscriptions.length === 0 ? (
		<p>No active subscriptions found in Stripe.</p>
	  ) : (
		<div className="overflow-x-auto bg-white shadow rounded">
		  <table className="min-w-full table-auto">
			<thead>
			  <tr className="bg-gray-100">
				<th className="px-3 py-2 text-left">Subscription ID</th>
				<th className="px-3 py-2 text-left">Customer Email</th>
				<th className="px-3 py-2 text-left">Status</th>
				<th className="px-3 py-2 text-left">Period Ends</th>
				<th className="px-3 py-2 text-left">Price</th>
				<th className="px-3 py-2 text-left">Action</th>
			  </tr>
			</thead>
			<tbody>
			  {subscriptions.map(sub => (
				<tr key={sub.id} className="border-t">
				  <td className="px-3 py-2 text-sm text-gray-700">{sub.id}</td>
				  <td className="px-3 py-2">{sub.customer_email || '—'}</td>
				  <td className="px-3 py-2">{sub.status}</td>
				  <td className="px-3 py-2">
					{new Date(sub.current_period_end * 1000).toLocaleString()}
				  </td>
				  <td className="px-3 py-2">
					{sub.priceAmount != null && sub.priceCurrency
					  ? new Intl.NumberFormat('en-US', {
						  style: 'currency',
						  currency: sub.priceCurrency,
						}).format(sub.priceAmount / 100)
					  : '—'}
				  </td>
				  <td className="px-3 py-2">
					<button
					  onClick={() => handleImport(sub.id)}
					  disabled={sub.imported || importing[sub.id]}
					  className={`px-3 py-1 rounded ${
						sub.imported
						  ? 'bg-green-500 text-white cursor-default'
						  : 'bg-blue-500 text-white hover:bg-blue-600'
					  } ${importing[sub.id] ? 'opacity-50 cursor-wait' : ''}`}
					>
					  {sub.imported
						? 'Imported'
						: importing[sub.id]
						? 'Importing…'
						: 'Import'}
					</button>
				  </td>
				</tr>
			  ))}
			</tbody>
		  </table>
		</div>
	  )}
	</div>
  );
}
