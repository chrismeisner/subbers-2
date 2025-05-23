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

  const handleSubmit = async (values: FormValues) => {
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
	  setStep('confirm');
	} catch (err: any) {
	  console.error('[NewSubscription] error:', err);
	  alert(err.message);
	}
  };

  if (step === 'confirm' && createdPkgId) {
	return (
	  <div className="container mx-auto p-4">
		<h1 className="text-2xl font-bold mb-4">Confirm Subscription</h1>
		<ReviewSummary
		  subscriptionId={createdPkgId}
		  onBack={() => setStep('form')}
		  onDone={() => router.push('/dashboard')}
		/>
	  </div>
	);
  }

  return (
	<div className="container mx-auto p-4">
	  <h1 className="text-2xl font-bold mb-4">Create New Subscription</h1>
	  <SubscriptionPackageForm onSubmit={handleSubmit} />
	</div>
  );
}
