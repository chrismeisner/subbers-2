// app/subscriptions/new/ReviewSummary.tsx
'use client';

import { useEffect, useState } from 'react';

interface SubscriptionFields {
  Title: string;
  FirstSession: string;
  Recurring: boolean;
  Frequency: string;
  RRule?: string;
  Duration?: number;
  Price?: number;
  Currency?: string;
  Interval?: string;
  Status?: string;
}

export default function ReviewSummary({
  subscriptionId,
  onBack,
  onSaveDraft,
  onCreate,
  isProcessing,
}: {
  subscriptionId: string;
  /** Called if the user wants to go back and edit the form */
  onBack: () => void;
  /** Called to save as draft and exit */
  onSaveDraft: () => void;
  /** Called to create subscription (payment link) and exit */
  onCreate: () => void;
  /** Whether an API call is in progress */
  isProcessing: boolean;
}) {
  const [fields, setFields] = useState<SubscriptionFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
	setLoading(true);
	setError(null);
	fetch('/api/subscriptions/packages')
	  .then(res => {
		if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
		return res.json();
	  })
	  .then((data: { subscriptionPackages: { id: string; fields: any }[] }) => {
		const pkg = data.subscriptionPackages.find(p => p.id === subscriptionId);
		if (!pkg) {
		  setError('Subscription not found.');
		} else {
		  setFields(pkg.fields as SubscriptionFields);
		}
	  })
	  .catch(err => {
		console.error('[ReviewSummary] error', err);
		setError('Failed to load subscription.');
	  })
	  .finally(() => setLoading(false));
  }, [subscriptionId]);

  if (loading) return <p>Loading summary…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!fields) return null;

  return (
	<div className="bg-white shadow rounded p-6 space-y-6">
	  <h2 className="text-2xl font-semibold">Subscription Summary</h2>
	  <ul className="list-disc list-inside space-y-1">
		<li><strong>Title:</strong> {fields.Title}</li>
		<li>
		  <strong>First Session:</strong>{' '}
		  {fields.FirstSession
			? new Date(fields.FirstSession).toLocaleString()
			: '—'}
		</li>
		<li><strong>Recurring:</strong> {fields.Recurring ? 'Yes' : 'No'}</li>
		<li><strong>Frequency:</strong> {fields.Frequency}</li>
		<li><strong>RRULE:</strong> {fields.RRule ?? '—'}</li>
		<li>
		  <strong>Duration:</strong>{' '}
		  {fields.Duration != null ? `${fields.Duration} min` : '—'}
		</li>
		<li>
		  <strong>Price:</strong>{' '}
		  {fields.Price != null && fields.Currency
			? new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: fields.Currency,
			  }).format(fields.Price / 100)
			: '—'}
		</li>
		<li><strong>Interval:</strong> {fields.Interval}</li>
		<li><strong>Status:</strong> {fields.Status ?? 'Draft'}</li>
	  </ul>

	  <div className="flex space-x-3">
		<button
		  onClick={onBack}
		  disabled={isProcessing}
		  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
		>
		  Edit
		</button>
		<button
		  onClick={onSaveDraft}
		  disabled={isProcessing}
		  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
		>
		  {isProcessing ? 'Saving…' : 'Save as draft'}
		</button>
		<button
		  onClick={onCreate}
		  disabled={isProcessing}
		  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
		>
		  {isProcessing ? 'Creating…' : 'Create Subscription'}
		</button>
	  </div>
	</div>
  );
}
