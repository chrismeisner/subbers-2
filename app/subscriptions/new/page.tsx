// app/subscriptions/new/page.tsx
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

  // Called when the user submits the form
  const handleSubmit = async (values: FormValues) => {
	setLoading(true);
	try {
	  const res = await fetch('/api/subscriptions/packages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ forceCreate: true, ...values }),
	  });
	  if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to create subscription.');
	  }
	  const { subscriptionPackage } = await res.json();
	  setCreatedPkgId(subscriptionPackage.id);
	  setFormValues(values);
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

  // Save as draft and return to dashboard
  const handleSaveDraft = () => {
	router.push('/dashboard');
  };

  // Create payment link, set live, then go to dashboard
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
	  router.push('/dashboard');
	} catch (err: any) {
	  console.error('[NewSubscription] create subscription error:', err);
	  alert(err.message);
	} finally {
	  setLoading(false);
	}
  };

  // Form step
  if (step === 'form') {
	return (
	  <div className="container mx-auto p-4">
		<h1 className="text-2xl font-bold mb-4">Create New Subscription</h1>
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
