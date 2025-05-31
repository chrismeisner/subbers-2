// File: app/dashboard/components/StripePaymentLinks.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export interface PaymentLink {
  id: string;
  url: string;
  active: boolean;
  title: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
}

interface Props {
  paymentLinks: PaymentLink[];
  stripeAccountId: string | null;
}

export default function StripePaymentLinks({
  paymentLinks,
  stripeAccountId,
}: Props) {
  return (
	<div className="p-4 bg-white shadow rounded">
	  <h2 className="text-xl font-semibold mb-2">Stripe Payment Links</h2>
	  <table className="min-w-full table-auto">
		<thead>
		  <tr className="bg-gray-100">
			<th className="px-3 py-2 text-left">Title</th>
			<th className="px-3 py-2 text-left">URL</th>
			<th className="px-3 py-2 text-left">Price</th>
			<th className="px-3 py-2 text-left">Active</th>
			<th className="px-3 py-2 text-left">Link ID</th>
			<th className="px-3 py-2 text-left">Manage</th>
		  </tr>
		</thead>
		<tbody>
		  {paymentLinks.map((pl) => {
			const manageUrl = stripeAccountId
			  ? `https://dashboard.stripe.com/${stripeAccountId}/payment-links/${pl.id}`
			  : null;

			return (
			  <tr key={pl.id} className="border-t">
				{/* ← make Title a clickable Next.js Link */}
				<td className="px-3 py-2">
				  {pl.title ? (
					<Link
					  href={`/payment-links/${encodeURIComponent(pl.id)}`}
					  className="text-blue-600 hover:underline"
					>
					  {pl.title}
					</Link>
				  ) : (
					'—'
				  )}
				</td>

				<td className="px-3 py-2">
				  <a
					href={pl.url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-600 hover:underline"
				  >
					{pl.url}
				  </a>
				</td>

				<td className="px-3 py-2">
				  {pl.priceAmount != null && pl.priceCurrency
					? new Intl.NumberFormat('en-US', {
						style: 'currency',
						currency: pl.priceCurrency,
					  }).format(pl.priceAmount / 100)
					: '—'}
				</td>

				<td className="px-3 py-2">{pl.active ? 'Yes' : 'No'}</td>
				<td className="px-3 py-2 text-sm text-gray-600">{pl.id}</td>
				<td className="px-3 py-2">
				  {manageUrl ? (
					<a
					  href={manageUrl}
					  target="_blank"
					  rel="noopener noreferrer"
					  className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
					>
					  Manage
					</a>
				  ) : (
					<span className="text-gray-400">—</span>
				  )}
				</td>
			  </tr>
			);
		  })}
		</tbody>
	  </table>
	</div>
  );
}
