// File: app/dashboard/components/StripeCustomers.tsx
'use client';

import React from 'react';

export interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface Props {
  customers: Customer[];
  hasMore: boolean;
  loadMore: () => void;
}

export default function StripeCustomers({ customers, hasMore, loadMore }: Props) {
  return (
	<div className="p-4 bg-white shadow rounded">
	  <h2 className="text-xl font-semibold mb-2">Stripe Customers</h2>
	  <table className="min-w-full table-auto">
		<thead>
		  <tr className="bg-gray-100">
			<th className="px-3 py-2 text-left">Name</th>
			<th className="px-3 py-2 text-left">Email</th>
			<th className="px-3 py-2 text-left">Customer ID</th>
		  </tr>
		</thead>
		<tbody>
		  {customers.map(c => (
			<tr key={c.id} className="border-t">
			  <td className="px-3 py-2">{c.name || '—'}</td>
			  <td className="px-3 py-2">{c.email || '—'}</td>
			  <td className="px-3 py-2 text-sm text-gray-600">{c.id}</td>
			</tr>
		  ))}
		</tbody>
	  </table>
	  {hasMore && (
		<button
		  onClick={loadMore}
		  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
		>
		  Load more
		</button>
	  )}
	</div>
  );
}
