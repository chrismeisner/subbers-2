// File: app/dashboard/components/StripePaymentLinks.tsx
'use client';

import React from 'react';

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
}

export default function StripePaymentLinks({ paymentLinks }: Props) {
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
		  </tr>
		</thead>
		<tbody>
		  {paymentLinks.map(pl => (
			<tr key={pl.id} className="border-t">
			  <td className="px-3 py-2">{pl.title || '—'}</td>
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
			</tr>
		  ))}
		</tbody>
	  </table>
	</div>
  );
}
