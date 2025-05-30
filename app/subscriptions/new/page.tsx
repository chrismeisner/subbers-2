// File: app/subscriptions/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SubscriptionPackageForm, { FormValues } from '@/components/SubscriptionPackageForm';
import ReviewSummary from './ReviewSummary';

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [createdPkgId, setCreatedPkgId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [loading, setLoading] = useState(false);

  // Called when the user submits the form -> create record & set In Review
  const handleSubmit = async (values: FormValues) => {
	setLoading(true);
	try {
	  // 1️⃣ Create new record as Draft via upsert endpoint
	  const createRes = await fetch('/api/subscriptions/packages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ forceCreate: true, ...values }),
	  });
	  if (!createRes.ok) {
		const err = await createRes.json();
		throw new Error(err.error || 'Failed to create subscription.');
	  }
	  const { subscriptionPackage } = await createRes.json();
	  const pkgId = subscriptionPackage.id;
	  setCreatedPkgId(pkgId);
	  setFormValues(values);

	  // 2️⃣ Immediately mark as In Review
	  await fetch('/api/subscriptions/packages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ recordId: pkgId, Status: 'In Review' }),
	  });

	  setStep('confirm');
	} catch (err: any) {
	  console.error('[NewSubscription] error:', err);
	  alert(err.message);
	} finally {
	  setLoading(false);
	}
  };

  // Return to the form for edits
  const handleEdit = () => {
	setStep('form');
  };

  // Save as draft (mark record Draft) and return to dashboard
  const handleSaveDraft = async () => {
	if (createdPkgId) {
	  setLoading(true);
	  try {
		await fetch('/api/subscriptions/packages', {
		  method: 'POST',
		  headers: { 'Content-Type': 'application/json' },
		  body: JSON.stringify({ recordId: createdPkgId, Status: 'Draft' }),
		});
	  } catch (err: any) {
		console.error('[NewSubscription] save draft error:', err);
		alert('Failed to save draft.');
		return;
	  } finally {
		setLoading(false);
	  }
	}
	// Force refresh dashboard to show drafts
	router.push('/dashboard?forceRefresh=1');
  };

  // Create payment link, set live, then go to dashboard with forced refresh
  const handleCreateSubscription = async () => {
	if (!createdPkgId) return;
	setLoading(true);
	try {
	  const res = await fetch('/api/subscriptions/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscriptionPackageId: createdPkgId }),
	  });
	  if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to create subscription.');
	  }
	  // Redirect to dashboard fresh
	  router.push('/dashboard?forceRefresh=1');
	} catch (err: any) {
	  console.error('[NewSubscription] create subscription error:', err);
	  alert(err.message);
	} finally {
	  setLoading(false);
	}
  };

  // Cancel discards any data
  const handleCancel = () => {
	router.push('/dashboard');
  };

  // Form step with Cancel button
  if (step === 'form') {
	return (
	  <div className="container mx-auto p-4">
		<div className="flex items-center justify-between mb-4">
		  <h1 className="text-2xl font-bold">Create New Subscription</h1>
		  <button
			onClick={handleCancel}
			className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
		  >
			Cancel
		  </button>
		</div>
		<SubscriptionPackageForm
		  onSubmit={handleSubmit}
		  isSubmitting={loading}
		  submitLabel="Review"
		  submittingLabel="Getting Ready"
		  initial={formValues ?? undefined}
		/>
	  </div>
	);
  }

  // Confirm (Summary) step
  return (
	<div className="container mx-auto p-4">
	  <h1 className="text-2xl font-bold mb-4">Subscription Summary</h1>
	  <ReviewSummary
		subscriptionId={createdPkgId!}
		onBack={handleEdit}
		onSaveDraft={handleSaveDraft}
		onCreate={handleCreateSubscription}
		isProcessing={loading}
	  />
	</div>
  );
}
