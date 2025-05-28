// app/subscriptions/[slug]/edit/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SubscriptionPackageForm, { FormValues } from '@/components/SubscriptionPackageForm';

export default function EditSubscriptionPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [recordId, setRecordId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<FormValues> & { Status?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
	async function fetchPackage() {
	  setLoading(true);
	  setError(null);
	  try {
		const res = await fetch('/api/subscriptions/packages');
		if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
		const data = (await res.json()) as { subscriptionPackages: { id: string; fields: any }[] };
		const pkg = data.subscriptionPackages.find(p => p.fields.Slug === slug);
		if (!pkg) {
		  setError('No subscription package found with this slug.');
		  return;
		}
		const {
		  Title,
		  FirstSession,
		  Recurring,
		  Frequency,
		  RRule,
		  Duration,
		  Price,
		  Currency,
		  Interval,
		  Status,
		} = pkg.fields;

		setRecordId(pkg.id);
		setInitialValues({
		  Title,
		  FirstSession,
		  Recurring,
		  Frequency,
		  RRule: RRule ?? undefined,
		  Duration: Duration ?? 60,
		  Price: Price ?? 0,
		  Currency: Currency ?? 'USD',
		  Interval: Interval ?? 'One-off',
		  Status,
		});
	  } catch (err: any) {
		console.error('[EditSubscriptionPage] error', err);
		setError(err.message || 'An unexpected error occurred.');
	  } finally {
		setLoading(false);
	  }
	}
	fetchPackage();
  }, [slug]);

  const handleSaveDraft = async (values: FormValues) => {
	if (!recordId) return;
	setSavingDraft(true);
	try {
	  const res = await fetch('/api/subscriptions/packages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ recordId, ...values }),
	  });
	  if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to save draft.');
	  }
	  router.push('/dashboard?forceRefresh=1');
	} catch (err: any) {
	  console.error('[EditSubscriptionPage] save draft error', err);
	  setError(err.message);
	} finally {
	  setSavingDraft(false);
	}
  };

  const handleCreateSubscription = async () => {
	if (!recordId) return;
	setCreating(true);
	try {
	  const res = await fetch('/api/subscriptions/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscriptionPackageId: recordId }),
	  });
	  if (!res.ok) {
		const errText = await res.text();
		throw new Error(errText || 'Failed to create subscription.');
	  }
	  router.push('/dashboard?forceRefresh=1');
	} catch (err: any) {
	  console.error('[EditSubscriptionPage] create subscription error', err);
	  setError(err.message);
	} finally {
	  setCreating(false);
	}
  };

  const handleCreateNextEvent = async () => {
	if (!slug || !initialValues?.FirstSession) return;
	setCreatingEvent(true);
	try {
	  const res = await fetch(
		`/api/subscriptions/${encodeURIComponent(slug)}/meetings/create`,
		{
		  method: 'POST',
		  headers: { 'Content-Type': 'application/json' },
		  body: JSON.stringify({ startsAt: initialValues.FirstSession }),
		}
	  );
	  if (!res.ok) {
		const json = await res.json().catch(() => ({}));
		throw new Error(json.error || 'Failed to create next event.');
	  }
	  router.refresh();
	} catch (err: any) {
	  console.error('[EditSubscriptionPage] create event error', err);
	  setError(err.message);
	} finally {
	  setCreatingEvent(false);
	}
  };

  const handleDelete = async () => {
	if (!recordId) return;
	setDeleting(true);
	try {
	  const res = await fetch('/api/subscriptions/packages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ recordId, Status: 'Deleted' }),
	  });
	  if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to delete subscription.');
	  }
	  router.push('/dashboard?forceRefresh=1');
	} catch (err: any) {
	  console.error('[EditSubscriptionPage] delete error', err);
	  setError(err.message);
	  setDeleting(false);
	}
  };

  if (loading) return <p className="p-4">Loading subscription…</p>;
  if (error || !initialValues)
	return <p className="p-4 text-red-600">{error || 'Subscription not found.'}</p>;

  const isDraft = initialValues.Status === 'Draft';

  return (
	<div className="container mx-auto p-4 space-y-6">
	  <h1 className="text-2xl font-bold">Edit Subscription</h1>

	  <SubscriptionPackageForm
		initial={initialValues}
		onSubmit={handleSaveDraft}
		isSubmitting={savingDraft}
		submitLabel={isDraft ? 'Save Draft' : 'Save Subscription'}
		submittingLabel={isDraft ? 'Saving…' : 'Saving…'}
	  />

	  <div className="flex space-x-4">
		<button
		  onClick={handleCreateSubscription}
		  disabled={creating}
		  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
		>
		  {creating ? 'Creating…' : 'Create Subscription'}
		</button>

		<button
		  onClick={handleCreateNextEvent}
		  disabled={creatingEvent}
		  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
		>
		  {creatingEvent
			? 'Creating…'
			: `Create Next Event (${new Date(initialValues.FirstSession!).toLocaleString()})`}
		</button>

		<button
		  onClick={() => setShowDeleteModal(true)}
		  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
		>
		  Delete Subscription
		</button>
	  </div>

	  {showDeleteModal && (
		<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
		  <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
			<h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
			<p className="mb-6">
			  Are you sure you want to delete the subscription “
			  <strong>{initialValues.Title}</strong>”? This action cannot be undone.
			</p>
			<div className="flex justify-end space-x-4">
			  <button
				onClick={() => setShowDeleteModal(false)}
				className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
			  >
				Cancel
			  </button>
			  <button
				onClick={handleDelete}
				disabled={deleting}
				className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
			  >
				{deleting ? 'Deleting…' : 'Delete'}
			  </button>
			</div>
		  </div>
		</div>
	  )}
	</div>
  );
}
