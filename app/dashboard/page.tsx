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

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface Meeting {
  id: string;
  topic: string;
  start_time: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession({ required: true });
  console.log('🛠️ [Dashboard] render — status:', status, 'session:', session);

  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	console.log('🔄 [Dashboard] useEffect: starting fetchAll');
	async function fetchAll() {
	  setLoading(true);
	  try {
		console.log('➡️ [Dashboard] fetching /api/user/status');
		const res = await fetch('/api/user/status');
		const data: UserStatus = await res.json();
		console.log('✅ [Dashboard] user status:', data);
		setUserStatus(data);

		if (data.stripeConnected) {
		  console.log('➡️ [Dashboard] fetching Stripe customers');
		  const custRes = await fetch('/api/stripe/customers');
		  const { customers } = await custRes.json();
		  console.log('✅ [Dashboard] customers:', customers);
		  setCustomers(customers);
		}

		if (data.zoomConnected) {
		  console.log('➡️ [Dashboard] fetching Zoom meetings');
		  const meetRes = await fetch('/api/zoom/meetings');
		  const { meetings } = await meetRes.json();
		  console.log('✅ [Dashboard] meetings:', meetings);
		  setMeetings(meetings);
		}
	  } catch (err) {
		console.error('❌ [Dashboard] fetchAll error', err);
	  } finally {
		setLoading(false);
		console.log('🔚 [Dashboard] fetchAll complete — loading:', false);
	  }
	}
	fetchAll();
  }, []);

  if (status === 'loading' || loading || !userStatus) {
	console.log(
	  '⏳ [Dashboard] loading — status:',
	  status,
	  'loading:',
	  loading,
	  'userStatus:',
	  userStatus
	);
	return <p className="p-4">Loading dashboard…</p>;
  }

  console.log('🚀 [Dashboard] rendering UI — userStatus:', userStatus);

  return (
	<div className="space-y-6">
	  <h1 className="text-2xl font-bold">Dashboard</h1>

	  {/* Stripe Status */}
	  <div className="flex items-center justify-between p-4 bg-white shadow rounded">
		<span>Stripe:</span>
		{userStatus.stripeConnected ? (
		  <button
			onClick={() => {
			  console.log(
				'🔌 [Dashboard] disconnecting Stripe for user:',
				session?.user?.email
			  );
			  window.location.href = '/api/stripe/disconnect';
			}}
			className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
		  >
			Disconnect
		  </button>
		) : (
		  <button
			onClick={() => {
			  console.log(
				'🔗 [Dashboard] connecting Stripe for user:',
				session?.user?.email
			  );
			  window.location.href = '/api/stripe/connect';
			}}
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
			onClick={() => {
			  console.log(
				'🔌 [Dashboard] disconnecting Zoom for user:',
				session?.user?.email
			  );
			  window.location.href = '/api/zoom/disconnect';
			}}
			className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
		  >
			Disconnect
		  </button>
		) : (
		  <button
			onClick={() => {
			  console.log(
				'🔗 [Dashboard] connecting Zoom for user:',
				session?.user?.email
			  );
			  window.location.href = '/api/zoom/connect';
			}}
			className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
		  >
			Connect Zoom
		  </button>
		)}
	  </div>

	  {/* Stripe Customers Table */}
	  {customers.length > 0 && (
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
			  {customers.map((c) => (
				<tr key={c.id} className="border-t">
				  <td className="px-3 py-2">{c.name ?? '—'}</td>
				  <td className="px-3 py-2">{c.email ?? '—'}</td>
				  <td className="px-3 py-2 text-sm text-gray-600">{c.id}</td>
				</tr>
			  ))}
			</tbody>
		  </table>
		</div>
	  )}

	  {/* Upcoming Zoom Meetings Table */}
	  {meetings.length > 0 && (
		<div className="p-4 bg-white shadow rounded">
		  <h2 className="text-xl font-semibold mb-2">Upcoming Zoom Meetings</h2>
		  <table className="min-w-full table-auto">
			<thead>
			  <tr className="bg-gray-100">
				<th className="px-3 py-2 text-left">Topic</th>
				<th className="px-3 py-2 text-left">Start Time</th>
				<th className="px-3 py-2 text-left">Meeting ID</th>
			  </tr>
			</thead>
			<tbody>
			  {meetings.map((m) => (
				<tr key={m.id} className="border-t">
				  <td className="px-3 py-2">{m.topic}</td>
				  <td className="px-3 py-2">
					{new Date(m.start_time).toLocaleString()}
				  </td>
				  <td className="px-3 py-2 text-sm text-gray-600">{m.id}</td>
				</tr>
			  ))}
			</tbody>
		  </table>
		</div>
	  )}
	</div>
  );
}
