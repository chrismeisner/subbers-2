// File: app/dashboard/components/StripeStatus.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export interface UserStatus {
  stripeConnected: boolean;
  stripeAccountId: string | null;
  stripeAccountBalance: { amount: number; currency: string } | null;
  zoomConnected: boolean;
  zoomUserEmail: string | null;
}

interface Props {
  userStatus: UserStatus;
}

export default function StripeStatus({ userStatus }: Props) {
  return (
	<div className="p-4 bg-white shadow rounded">
	  <div className="flex items-center justify-between">
		<span className="font-medium">Stripe:</span>
		{userStatus.stripeConnected ? (
		  <button
			onClick={() => (window.location.href = '/api/stripe/disconnect')}
			className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
		  >
			Disconnect
		  </button>
		) : (
		  <button
			onClick={() => (window.location.href = '/api/stripe/connect')}
			className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
		  >
			Connect Stripe
		  </button>
		)}
	  </div>
	  {userStatus.stripeConnected && userStatus.stripeAccountBalance && (
		<p className="mt-2 text-sm text-gray-700">
		  Current Stripe balance:{' '}
		  <strong>
			{new Intl.NumberFormat('en-US', {
			  style: 'currency',
			  currency: userStatus.stripeAccountBalance.currency,
			}).format(userStatus.stripeAccountBalance.amount / 100)}
		  </strong>
		</p>
	  )}
	</div>
  );
}
