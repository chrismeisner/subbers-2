// components/SubscriptionPackageForm.tsx
'use client';

import React, { useState, FormEvent, ChangeEvent, FocusEvent } from 'react';
import { RRule } from 'rrule';

export interface FormValues {
  Title: string;
  FirstSession: string;    // ISO date-time string
  Recurring: boolean;
  Frequency: string;       // "None" | "Daily" | "Weekly" | "Monthly" | "Custom"
  RRule?: string;
  Duration: number;        // total minutes
  Price: number;           // in cents
  Currency: string;
  Interval: string;        // "One-off" | "Monthly" | "Yearly"
  TimeZone: string;        // IANA timezone identifier
}

interface SubscriptionPackageFormProps {
  /** Pre-filled values for any fields */
  initial?: Partial<FormValues>;
  /** Called with form values when the user submits */
  onSubmit: (values: FormValues) => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Label to show on the submit button when idle */
  submitLabel?: string;
  /** Label to show on the submit button when submitting */
  submittingLabel?: string;
}

export default function SubscriptionPackageForm({
  initial = {},
  onSubmit,
  isSubmitting = false,
  submitLabel,
  submittingLabel,
}: SubscriptionPackageFormProps) {
  // Browser time zone
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Title
  const [Title, setTitle] = useState(initial.Title ?? '');

  // Compute one week from today in YYYY-MM-DD
  const oneWeek = new Date();
  oneWeek.setDate(oneWeek.getDate() + 7);
  const defaultDate = oneWeek.toISOString().slice(0, 10);

  // Split FirstSession into date & time
  const initialFirst = initial.FirstSession ? new Date(initial.FirstSession) : null;
  const [dateInput, setDateInput] = useState(
	initialFirst ? initialFirst.toISOString().slice(0, 10) : defaultDate
  );
  const [timeInput, setTimeInput] = useState(
	initialFirst ? initialFirst.toTimeString().slice(0, 5) : '12:00'
  );

  // Recurrence
  const [Recurring, setRecurring] = useState(initial.Recurring ?? true);
  const [Frequency, setFrequency] = useState(initial.Frequency ?? 'Monthly');

  // Builder state for custom RRULE
  const [customFreq, setCustomFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [customInterval, setCustomInterval] = useState(1);
  const [byWeekDays, setByWeekDays] = useState<('MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU')[]>([]);
  const [monthDay, setMonthDay] = useState<number>(oneWeek.getDate());
  const [endCondition, setEndCondition] = useState<'never' | 'after' | 'onDate'>('never');
  const [endCount, setEndCount] = useState(1);
  const [endDate, setEndDate] = useState(defaultDate);

  // Duration: hours & minutes
  const initialDuration = initial.Duration != null ? initial.Duration : 60;
  const [hours, setHours] = useState(Math.floor(initialDuration / 60));
  const [minutes, setMinutes] = useState(initialDuration % 60);

  // Price & Currency
  const [Price, setPrice] = useState(initial.Price ?? 0);
  const [displayPrice, setDisplayPrice] = useState<string>(
	initial.Price != null
	  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initial.Price / 100)
	  : ''
  );
  const [Currency, setCurrency] = useState(initial.Currency ?? 'USD');

  // Interval
  const [Interval, setInterval] = useState(initial.Interval ?? 'Monthly');

  const [error, setError] = useState<string | null>(null);

  // Maps for RRule builder
  const freqMap = {
	DAILY: RRule.DAILY,
	WEEKLY: RRule.WEEKLY,
	MONTHLY: RRule.MONTHLY,
	YEARLY: RRule.YEARLY,
  };
  const weekdayMap = {
	MO: RRule.MO, TU: RRule.TU, WE: RRule.WE,
	TH: RRule.TH, FR: RRule.FR, SA: RRule.SA, SU: RRule.SU,
  };

  const handleSubmit = (e: FormEvent) => {
	e.preventDefault();
	setError(null);

	// Title validation
	if (!Title.trim()) {
	  setError('Please enter a title.');
	  return;
	}

	// FirstSession validation
	if (!dateInput || !timeInput) {
	  setError('Please select both a date and a time for the first meeting.');
	  return;
	}
	const combined = new Date(`${dateInput}T${timeInput}:00`);
	if (isNaN(combined.getTime())) {
	  setError('Invalid date or time.');
	  return;
	}
	if (combined <= new Date()) {
	  setError('First meeting must be in the future.');
	  return;
	}

	// Recurrence validation
	if (Recurring && Frequency === 'None') {
	  setError('Please select a recurrence frequency.');
	  return;
	}

	// Duration validation
	const totalMinutes = hours * 60 + minutes;
	if (totalMinutes <= 0) {
	  setError('Please enter a positive duration.');
	  return;
	}

	// Price validation
	if (Price <= 0) {
	  setError('Please enter a positive price.');
	  return;
	}

	// Build form values
	const values: FormValues = {
	  Title: Title.trim(),
	  FirstSession: combined.toISOString(),
	  Recurring,
	  Frequency,
	  Duration: totalMinutes,
	  Price,
	  Currency,
	  Interval,
	  TimeZone: timeZone,
	};

	// Handle RRule
	if (Recurring) {
	  if (Frequency === 'Custom') {
		try {
		  const opts: any = {
			freq: freqMap[customFreq],
			interval: customInterval,
			dtstart: combined,
		  };
		  if (customFreq === 'WEEKLY') {
			if (byWeekDays.length === 0) {
			  setError('Pick at least one weekday for custom weekly recurrence.');
			  return;
			}
			opts.byweekday = byWeekDays.map(d => weekdayMap[d]);
		  }
		  if (customFreq === 'MONTHLY') {
			opts.bymonthday = monthDay;
		  }
		  if (endCondition === 'after') {
			opts.count = endCount;
		  }
		  if (endCondition === 'onDate') {
			opts.until = new Date(endDate);
		  }
		  values.RRule = new RRule(opts).toString();
		} catch {
		  setError('Failed to build custom RRULE.');
		  return;
		}
	  } else {
		values.RRule = `FREQ=${Frequency.toUpperCase()}`;
	  }
	}

	onSubmit(values);
  };

  // Currency formatting handlers
  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
	setDisplayPrice(e.target.value);
  };
  const handlePriceBlur = (e: FocusEvent<HTMLInputElement>) => {
	const raw = e.target.value.replace(/[^0-9.\-]/g, '');
	const amount = parseFloat(raw);
	if (isNaN(amount) || amount < 0) {
	  setError('Invalid price.');
	  setPrice(0);
	  setDisplayPrice('');
	} else {
	  const cents = Math.round(amount * 100);
	  setPrice(cents);
	  setDisplayPrice(
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
	  );
	}
  };

  const idleLabel = submitLabel ?? (initial.Title ? 'Save Subscription' : 'Review');
  const busyLabel = submittingLabel ?? 'Submitting…';

  return (
	<form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 bg-white shadow rounded space-y-8">
	  {error && <p className="text-red-600">{error}</p>}

	  {/* First Meeting & Meeting Details Section */}
	  <section className="space-y-4">
		<h2 className="text-xl font-bold">First Meeting Details</h2>
		<p className="text-sm text-gray-500">
		  Times are shown in your local time zone: <strong>{timeZone}</strong>
		</p>

		<div>
		  <label className="block font-medium">Title</label>
		  <p className="text-xs text-gray-500">What would you call this session?</p>
		  <input
			type="text"
			value={Title}
			onChange={e => setTitle(e.target.value)}
			className="mt-1 block w-full border-gray-300 rounded p-2"
			placeholder="e.g. Weekly Coaching"
		  />
		</div>

		<div className="grid grid-cols-2 gap-4">
		  <div>
			<label className="block font-medium">Date</label>
			<p className="text-xs text-gray-500">Select the date of the first meeting</p>
			<input
			  type="date"
			  value={dateInput}
			  onChange={e => setDateInput(e.target.value)}
			  className="mt-1 block w-full border-gray-300 rounded p-2"
			/>
		  </div>
		  <div>
			<label className="block font-medium">Time</label>
			<p className="text-xs text-gray-500">Choose a time in 5-minute increments</p>
			<input
			  type="time"
			  step={300}
			  value={timeInput}
			  onChange={e => setTimeInput(e.target.value)}
			  className="mt-1 block w-full border-gray-300 rounded p-2"
			/>
		  </div>
		</div>

		<div className="flex items-center space-x-2">
		  <input
			id="recurring"
			type="checkbox"
			checked={Recurring}
			onChange={e => setRecurring(e.target.checked)}
			className="h-4 w-4"
		  />
		  <label htmlFor="recurring" className="font-medium">Recurring?</label>
		</div>

		<div>
		  <label className="block font-medium">Frequency</label>
		  <p className="text-xs text-gray-500">How often should sessions repeat?</p>
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

		{/* Custom RRULE Builder */}
		{Recurring && Frequency === 'Custom' && (
		  <section className="p-4 border rounded space-y-4">
			<h4 className="font-semibold">Custom Recurrence Builder</h4>
			<p className="text-sm text-gray-500">Configure detailed recurrence rules below.</p>

			<div>
			  <label className="block font-medium">Frequency</label>
			  <select
				value={customFreq}
				onChange={e => setCustomFreq(e.target.value as any)}
				className="mt-1 block w-full border-gray-300 rounded p-2"
			  >
				<option value="DAILY">Daily</option>
				<option value="WEEKLY">Weekly</option>
				<option value="MONTHLY">Monthly</option>
				<option value="YEARLY">Yearly</option>
			  </select>
			</div>

			<div>
			  <label className="block font-medium">Repeat every…</label>
			  <input
				type="number"
				min={1}
				value={customInterval}
				onChange={e => setCustomInterval(parseInt(e.target.value, 10) || 1)}
				className="mt-1 block w-24 border-gray-300 rounded p-2"
			  />
			</div>

			{customFreq === 'WEEKLY' && (
			  <fieldset className="space-y-2">
				<legend className="font-medium">On Days of the Week</legend>
				<div className="flex flex-wrap gap-2">
				  {(['MO','TU','WE','TH','FR','SA','SU'] as Array<keyof typeof weekdayMap>).map(d => (
					<label key={d} className="inline-flex items-center space-x-1">
					  <input
						type="checkbox"
						checked={byWeekDays.includes(d)}
						onChange={() => {
						  setByWeekDays(curr =>
							curr.includes(d) ? curr.filter(x => x !== d) : [...curr, d]
						  );
						}}
						className="h-4 w-4"
					  />
					  <span>{d}</span>
					</label>
				  ))}
				</div>
				{byWeekDays.length === 0 && (
				  <p className="text-xs text-red-600">Pick at least one day for weekly recurrence</p>
				)}
			  </fieldset>
			)}

			{customFreq === 'MONTHLY' && (
			  <div>
				<label className="block font-medium">On Day of Month</label>
				<input
				  type="number"
				  min={1}
				  max={31}
				  value={monthDay}
				  onChange={e => setMonthDay(parseInt(e.target.value, 10) || 1)}
				  className="mt-1 block w-24 border-gray-300 rounded p-2"
				/>
			  </div>
			)}

			<div>
			  <label className="block font-medium">Ends</label>
			  <select
				value={endCondition}
				onChange={e => setEndCondition(e.target.value as any)}
				className="mt-1 block w-full border-gray-300 rounded p-2"
			  >
				<option value="never">Never</option>
				<option value="after">After</option>
				<option value="onDate">On date</option>
			  </select>
			</div>

			{endCondition === 'after' && (
			  <div>
				<label className="block font-medium">Occurrences</label>
				<input
				  type="number"
				  min={1}
				  value={endCount}
				  onChange={e => setEndCount(parseInt(e.target.value, 10) || 1)}
				  className="mt-1 block w-24 border-gray-300 rounded p-2"
				/>
			  </div>
			)}

			{endCondition === 'onDate' && (
			  <div>
				<label className="block font-medium">End Date</label>
				<input
				  type="date"
				  value={endDate}
				  onChange={e => setEndDate(e.target.value)}
				  className="mt-1 block w-full border-gray-300 rounded p-2"
				/>
			  </div>
			)}

			<div className="mt-4">
			  <strong>Preview:</strong>
			  <ul className="list-disc list-inside text-xs">
				{(() => {
				  try {
					const opts: any = {
					  freq: freqMap[customFreq],
					  interval: customInterval,
					  dtstart: new Date(`${dateInput}T${timeInput}:00`),
					};
					if (customFreq === 'WEEKLY') {
					  opts.byweekday = byWeekDays.map(d => weekdayMap[d]);
					}
					if (customFreq === 'MONTHLY') {
					  opts.bymonthday = monthDay;
					}
					if (endCondition === 'after') {
					  opts.count = endCount;
					}
					if (endCondition === 'onDate') {
					  opts.until = new Date(endDate);
					}
					const rule = new RRule(opts);
					return rule.all((date, i) => i < 5).map(d => (
					  <li key={d.toString()}>{d.toLocaleString()}</li>
					));
				  } catch {
					return <li>Invalid rule</li>;
				  }
				})()}
			  </ul>
			</div>
		  </section>
		)}

	  </section>

	  {/* Duration Section */}
	  <section className="space-y-4">
		<h3 className="text-lg font-semibold">Duration</h3>
		<p className="text-sm text-gray-500">How long each meeting should last</p>
		<div className="flex space-x-4">
		  <div>
			<label className="block font-medium">Hours</label>
			<input
			  type="number"
			  min={0}
			  value={hours}
			  onChange={e => setHours(parseInt(e.target.value, 10) || 0)}
			  className="mt-1 block w-24 border-gray-300 rounded p-2"
			/>
		  </div>
		  <div>
			<label className="block font-medium">Minutes</label>
			<select
			  value={minutes}
			  onChange={e => setMinutes(parseInt(e.target.value, 10))}
			  className="mt-1 block w-24 border-gray-300 rounded p-2"
			>
			  <option value={0}>00</option>
			  <option value={15}>15</option>
			  <option value={30}>30</option>
			  <option value={45}>45</option>
			</select>
		  </div>
		</div>
	  </section>

	  {/* Payment Schedule Section */}
	  <section className="space-y-4">
		<h3 className="text-lg font-semibold">Payment Schedule</h3>
		<p className="text-sm text-gray-500">Set your price and billing interval</p>

		<div>
		  <label className="block font-medium">Price</label>
		  <input
			type="text"
			value={displayPrice}
			onChange={handlePriceChange}
			onBlur={handlePriceBlur}
			className="mt-1 block w-full border-gray-300 rounded p-2"
			placeholder="$0.00"
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
	  </section>

	  <div>
		<button
		  type="submit"
		  disabled={isSubmitting}
		  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
		>
		  {isSubmitting ? submittingLabel ?? 'Submitting…' : submitLabel ?? idleLabel}
		</button>
	  </div>
	</form>
  );
}
