// app/subscriptions/[slug]/edit/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import SubscriptionPackageForm, { FormValues } from '@/components/SubscriptionPackageForm';

export default function EditSubscriptionPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [recordId, setRecordId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<FormValues> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
	async function fetchPackage() {
	  setLoading(true);
	  setError(null);

	  try {
		const res = await fetch('/api/subscriptions/packages');
		if (!res.ok) {
		  throw new Error(`Failed to fetch subscription packages: ${res.status}`);
		}
		const data = (await res.json()) as {
		  subscriptionPackages: { id: string; fields: Record<string, any> }[];
		};
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
		  Price,
		  Currency,
		  Interval,
		} = pkg.fields;
		setRecordId(pkg.id);
		setInitialValues({
		  Title,
		  FirstSession,
		  Recurring,
		  Frequency,
		  RRule: RRule ?? undefined,
		  Price: Price ?? 0,
		  Currency: Currency ?? 'USD',
		  Interval: Interval ?? 'One-off',
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

  const handleSubmit = async (values: FormValues) => {
	if (!recordId) {
	  setError('Record ID is missing.');
	  return;
	}
	try {
	  const res = await fetch('/api/subscriptions/packages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ recordId, ...values }),
	  });
	  if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to update subscription.');
	  }
	  router.push('/dashboard');
	} catch (err: any) {
	  console.error('[EditSubscriptionPage] update error', err);
	  setError(err.message || 'An unexpected error occurred.');
	}
  };

  if (loading) {
	return <p className="p-4">Loading subscription…</p>;
  }

  if (error) {
	return <p className="p-4 text-red-600">{error}</p>;
  }

  return (
	<div className="container mx-auto p-4">
	  <SubscriptionPackageForm initial={initialValues!} onSubmit={handleSubmit} />
	</div>
  );
}
