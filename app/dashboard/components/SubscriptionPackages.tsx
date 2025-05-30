// File: app/dashboard/components/SubscriptionPackages.tsx
'use client';

import Link from 'next/link';
import React from 'react';

export interface SubscriptionPackage {
  id: string;
  createdTime: string;
  fields: {
	Title: string;
	Slug: string;
	FirstSession: string;
	Recurring: boolean;
	Frequency: string;
	RRule?: string | null;
	Price?: number | null;
	Currency?: string | null;
	Interval?: string | null;
	Status?: string | null;
	PaymentLinkURL?: string | null;
  };
}

export type SortKey = 'Created' | 'FirstSession' | 'Title' | 'Price';

interface Props {
  packages: SubscriptionPackage[];
  sortKey: SortKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}

export default function SubscriptionPackages({ packages, sortKey, sortDirection, onSort }: Props) {
  if (packages.length === 0) {
	return (
	  <div className="p-4 bg-white shadow rounded">
		<h2 className="text-xl font-semibold mb-2">Subscription Packages</h2>
		<p className="text-center text-gray-600">No subscription packages found.</p>
	  </div>
	);
  }

  return (
	<div className="p-4 bg-white shadow rounded">
	  <h2 className="text-xl font-semibold mb-2">Subscription Packages</h2>
	  <table className="min-w-full table-auto">
		<thead>
		  <tr className="bg-gray-100">
			<th
			  className="px-3 py-2 text-left cursor-pointer"
			  onClick={() => onSort('Title')}
			>
			  Title{sortKey === 'Title' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
			</th>
			<th
			  className="px-3 py-2 text-left cursor-pointer"
			  onClick={() => onSort('Created')}
			>
			  Created{sortKey === 'Created' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
			</th>
			<th
			  className="px-3 py-2 text-left cursor-pointer"
			  onClick={() => onSort('FirstSession')}
			>
			  First Session{sortKey === 'FirstSession' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
			</th>
			<th className="px-3 py-2 text-left">Recurring</th>
			<th className="px-3 py-2 text-left">Frequency</th>
			<th className="px-3 py-2 text-left">RRule</th>
			<th
			  className="px-3 py-2 text-left cursor-pointer"
			  onClick={() => onSort('Price')}
			>
			  Price{sortKey === 'Price' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
			</th>
			<th className="px-3 py-2 text-left">Currency</th>
			<th className="px-3 py-2 text-left">Interval</th>
			<th className="px-3 py-2 text-left">Status</th>
			<th className="px-3 py-2 text-left">Stripe Status</th>
			<th className="px-3 py-2 text-left">Actions</th>
		  </tr>
		</thead>
		<tbody>
		  {packages.map(pkg => (
			<tr key={pkg.id} className="border-t">
			  <td className="px-3 py-2">
				<Link
				  href={`/subscriptions/${pkg.fields.Slug}`}
				  className="text-blue-600 hover:underline"
				>
				  {pkg.fields.Title}
				</Link>
			  </td>
			  <td className="px-3 py-2">{new Date(pkg.createdTime).toLocaleString()}</td>
			  <td className="px-3 py-2">{new Date(pkg.fields.FirstSession).toLocaleString()}</td>
			  <td className="px-3 py-2">{pkg.fields.Recurring ? 'Yes' : 'No'}</td>
			  <td className="px-3 py-2">{pkg.fields.Frequency}</td>
			  <td className="px-3 py-2">{pkg.fields.RRule || '—'}</td>
			  <td className="px-3 py-2">
				{pkg.fields.Price != null && pkg.fields.Currency
				  ? new Intl.NumberFormat('en-US', {
					  style: 'currency',
					  currency: pkg.fields.Currency,
					}).format(pkg.fields.Price / 100)
				  : '—'}
			  </td>
			  <td className="px-3 py-2">{pkg.fields.Currency || '—'}</td>
			  <td className="px-3 py-2">{pkg.fields.Interval || '—'}</td>
			  <td className="px-3 py-2">{pkg.fields.Status || '—'}</td>
			  <td className="px-3 py-2">
				{pkg.fields.PaymentLinkURL ? (
				  <a
					href={pkg.fields.PaymentLinkURL}
					target="_blank"
					rel="noopener noreferrer"
					className="text-green-600 hover:underline"
				  >
					Live
				  </a>
				) : (
				  <span className="text-red-500">Pending</span>
				)}
			  </td>
			  <td className="px-3 py-2">
				<Link
				  href={`/subscriptions/${pkg.fields.Slug}/edit`}
				  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
				  Edit
				</Link>
			  </td>
			</tr>
		  ))}
		</tbody>
	  </table>
	</div>
  );
}
