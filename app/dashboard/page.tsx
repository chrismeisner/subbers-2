// File: app/dashboard/page.tsx

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface UserStatus {
  stripeConnected: boolean;
  zoomConnected: boolean;
  stripeAccountId: string | null;
  zoomUserEmail: string | null;
}

export default function DashboardPage() {
  const { status } = useSession({ required: true });
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	async function fetchStatus() {
	  setLoading(true);
	  try {
		const res = await fetch('/api/user/status');
		const data: UserStatus = await res.json();
		setUserStatus(data);
	  } catch (err) {
		console.error('Failed to fetch user status', err);
	  } finally {
		setLoading(false);
	  }
	}
	fetchStatus();
  }, []);

  if (status === 'loading' || loading || !userStatus) {
	return <p className="p-4">Loading dashboard…</p>;
  }

  return (
	<div className="space-y-6">
	  <h1 className="text-2xl font-bold">Dashboard</h1>

	  {/* Stripe Status */}
	  <div className="flex items-center justify-between p-4 bg-white shadow rounded">
		<span>Stripe:</span>
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

	  {/* Zoom Status */}
	  <div className="flex items-center justify-between p-4 bg-white shadow rounded">
		<span>Zoom:</span>
		{userStatus.zoomConnected ? (
		  <button
			onClick={() => (window.location.href = '/api/zoom/disconnect')}
			className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
		  >
			Disconnect
		  </button>
		) : (
		  <button
			onClick={() => (window.location.href = '/api/zoom/connect')}
			className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
		  >
			Connect Zoom
		  </button>
		)}
	  </div>
	</div>
  );
}
