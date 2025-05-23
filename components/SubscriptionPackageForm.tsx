// components/SubscriptionPackageForm.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';

export interface FormValues {
  Title: string;
  Slug: string;
  FirstSession: string;   // ISO date-time string
  Recurring: boolean;
  Frequency: string;
  RRule?: string;
  Price: number;
  Currency: string;
  Interval: string;
}

interface SubscriptionPackageFormProps {
  /** Pre-filled values for any fields */
  initial?: Partial<FormValues>;
  /** Called with form values when the user submits */
  onSubmit: (values: FormValues) => void;
}

function generateSlug(title: string): string {
  return title
	.toLowerCase()
	.trim()
	.replace(/\s+/g, '-')
	.replace(/[^\w-]/g, '');
}

export default function SubscriptionPackageForm({
  initial = {},
  onSubmit,
}: SubscriptionPackageFormProps) {
  const [Title, setTitle] = useState(initial.Title ?? '');
  const [Slug, setSlug] = useState(initial.Slug ?? '');
  const [firstSessionInput, setFirstSessionInput] = useState(
	initial.FirstSession
	  ? new Date(initial.FirstSession).toISOString().slice(0, 16)
	  : ''
  );
  const [Recurring, setRecurring] = useState(initial.Recurring ?? false);
  const [Frequency, setFrequency] = useState(initial.Frequency ?? 'None');
  const [RRule, setRRule] = useState(initial.RRule ?? '');
  const [Price, setPrice] = useState(initial.Price ?? 0);
  const [Currency, setCurrency] = useState(initial.Currency ?? 'USD');
  const [Interval, setInterval] = useState(initial.Interval ?? 'One-off');
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug when the title changes and slug was not manually edited
  useEffect(() => {
	if (!initial.Slug) {
	  setSlug(generateSlug(Title));
	}
  }, [Title, initial.Slug]);

  const handleSubmit = (e: FormEvent) => {
	e.preventDefault();
	setError(null);

	// Slug validation
	if (!Slug.trim()) {
	  setError('Please enter a slug for the URL.');
	  return;
	}

	// Meeting validation
	if (!Title.trim()) {
	  setError('Please enter a title.');
	  return;
	}
	if (!firstSessionInput) {
	  setError('Please select the first session date/time.');
	  return;
	}
	const firstDate = new Date(firstSessionInput);
	if (isNaN(firstDate.getTime())) {
	  setError('Invalid date/time.');
	  return;
	}
	if (firstDate <= new Date()) {
	  setError('First session must be in the future.');
	  return;
	}
	if (Recurring) {
	  if (Frequency === 'None') {
		setError('Please select a recurrence frequency.');
		return;
	  }
	  if (Frequency === 'Custom' && !RRule.trim()) {
		setError('Please enter a custom RRULE.');
		return;
	  }
	}

	// Pricing validation
	if (Price <= 0) {
	  setError('Please enter a positive price.');
	  return;
	}

	// Build payload
	const values: FormValues = {
	  Title: Title.trim(),
	  Slug: Slug.trim(),
	  FirstSession: firstDate.toISOString(),
	  Recurring,
	  Frequency,
	  RRule: Recurring
		? Frequency === 'Custom'
		  ? RRule.trim()
		  : `FREQ=${Frequency.toUpperCase()}`
		: undefined,
	  Price,
	  Currency,
	  Interval,
	};

	onSubmit(values);
  };

  return (
	<form
	  onSubmit={handleSubmit}
	  className="max-w-xl mx-auto p-6 bg-white shadow rounded space-y-6"
	>
	  {error && <p className="text-red-600">{error}</p>}

	  {/* Meeting Setup */}
	  <div>
		<label className="block font-medium">Title</label>
		<input
		  type="text"
		  value={Title}
		  onChange={e => setTitle(e.target.value)}
		  className="mt-1 block w-full border-gray-300 rounded p-2"
		  placeholder="e.g. Weekly Coaching"
		/>
	  </div>

	  <div>
		<label className="block font-medium">Slug (URL-friendly)</label>
		<input
		  type="text"
		  value={Slug}
		  onChange={e => setSlug(e.target.value)}
		  className="mt-1 block w-full border-gray-300 rounded p-2"
		  placeholder="e.g. weekly-coaching"
		/>
		<p className="text-sm text-gray-500">This will be used in the URL.</p>
	  </div>

	  <div>
		<label className="block font-medium">First Session</label>
		<input
		  type="datetime-local"
		  value={firstSessionInput}
		  onChange={e => setFirstSessionInput(e.target.value)}
		  className="mt-1 block w-full border-gray-300 rounded p-2"
		/>
	  </div>

	  <div className="flex items-center space-x-2">
		<input
		  id="recurring"
		  type="checkbox"
		  checked={Recurring}
		  onChange={e => {
			setRecurring(e.target.checked);
			if (!e.target.checked) {
			  setFrequency('None');
			  setRRule('');
			}
		  }}
		  className="h-4 w-4"
		/>
		<label htmlFor="recurring" className="font-medium">
		  Recurring?
		</label>
	  </div>

	  <div>
		<label className="block font-medium">Frequency</label>
		<select
		  value={Frequency}
		  onChange={e => setFrequency(e.target.value)}
		  disabled={!Recurring}
		  className="mt-1 block w-full border-gray-300 rounded p-2 bg-white disabled:bg-gray-100"
		>
		  <option value="None">None</option>
		  <option value="Daily">Daily</option>
		  <option value="Weekly">Weekly</option>
		  <option value="Monthly">Monthly</option>
		  <option value="Custom">Custom</option>
		</select>
	  </div>

	  {Recurring && Frequency === 'Custom' && (
		<div>
		  <label className="block font-medium">Custom RRULE</label>
		  <input
			type="text"
			value={RRule}
			onChange={e => setRRule(e.target.value)}
			className="mt-1 block w-full border-gray-300 rounded p-2"
			placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR"
		  />
		</div>
	  )}

	  {/* Pricing Setup */}
	  <div>
		<label className="block font-medium">Price (cents)</label>
		<input
		  type="number"
		  value={Price}
		  onChange={e => setPrice(parseInt(e.target.value, 10) || 0)}
		  className="mt-1 block w-full border-gray-300 rounded p-2"
		/>
	  </div>

	  <div>
		<label className="block font-medium">Currency</label>
		<select
		  value={Currency}
		  onChange={e => setCurrency(e.target.value)}
		  className="mt-1 block w-full border-gray-300 rounded p-2"
		>
		  <option>USD</option>
		  <option>EUR</option>
		</select>
	  </div>

	  <div>
		<label className="block font-medium">Interval</label>
		<select
		  value={Interval}
		  onChange={e => setInterval(e.target.value)}
		  className="mt-1 block w-full border-gray-300 rounded p-2"
		>
		  <option>One-off</option>
		  <option>Monthly</option>
		  <option>Yearly</option>
		</select>
	  </div>

	  <div>
		<button
		  type="submit"
		  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
		>
		  {initial.Title ? 'Save Subscription' : 'Create Subscription'}
		</button>
	  </div>
	</form>
  );
}
