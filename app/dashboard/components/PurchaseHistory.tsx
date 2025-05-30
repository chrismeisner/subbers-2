// File: app/dashboard/components/PurchaseHistory.tsx
'use client';

import React from 'react';

export interface Purchase {
  id: string;
  created: number;
  customer_email: string | null;
  payment_status: string;
  productName: string | null;
  isRecurring: boolean;
  amount_total: number;
  currency: string;
  url: string | null;
  paymentLinkId: string | null;
}

interface Props {
  purchases: Purchase[];
  hasMore: boolean;
  loadMore: () => void;
}

export default function PurchaseHistory({ purchases, hasMore, loadMore }: Props) {
  return (
	<div className="p-4 bg-white shadow rounded">
	  <h2 className="text-xl font-semibold mb-2">Purchase History</h2>
	  <table className="min-w-full table-auto">
		<thead>
		  <tr className="bg-gray-100">
			<th className="px-3 py-2 text-left">Date</th>
			<th className="px-3 py-2 text-left">Customer Email</th>
			<th className="px-3 py-2 text-left">Status</th>
			<th className="px-3 py-2 text-left">Product</th>
			<th className="px-3 py-2 text-left">Recurring</th>
			<th className="px-3 py-2 text-left">Amount</th>
			<th className="px-3 py-2 text-left">View Link</th>
			<th className="px-3 py-2 text-left">Payment Link ID</th>
		  </tr>
		</thead>
		<tbody>
		  {purchases.length > 0 ? (
			purchases.map(p => (
			  <tr key={p.id} className="border-t">
				<td className="px-3 py-2">{new Date(p.created * 1000).toLocaleString()}</td>
				<td className="px-3 py-2">{p.customer_email || '—'}</td>
				<td className="px-3 py-2">{p.payment_status}</td>
				<td className="px-3 py-2">{p.productName || '—'}</td>
				<td className="px-3 py-2">{p.isRecurring ? 'Subscription' : 'One-off'}</td>
				<td className="px-3 py-2">
				  {new Intl.NumberFormat('en-US', {
					style: 'currency',
					currency: p.currency,
				  }).format(p.amount_total / 100)}
				</td>
				<td className="px-3 py-2">
				  {p.url ? (
					<a
					  href={p.url}
					  target="_blank"
					  rel="noopener noreferrer"
					  className="text-blue-600 hover:underline"
					>
					  View
					</a>
				  ) : (
					'—'
				  )}
				</td>
				<td className="px-3 py-2 text-sm text-gray-600">
				  {p.paymentLinkId || '—'}
				</td>
			  </tr>
			))
		  ) : (
			<tr>
			  <td colSpan={8} className="px-3 py-2 text-center text-gray-600">
				No purchases found.
			  </td>
			</tr>
		  )}
		</tbody>
	  </table>
	  {hasMore && (
		<button
		  onClick={loadMore}
		  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
		>
		  Load more purchases
		</button>
	  )}
	</div>
  );
}
