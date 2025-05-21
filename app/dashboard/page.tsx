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
	async function fetchAll() {
	  setLoading(true);
	  try {
		// Fetch Stripe/Zoom connection status
		const res = await fetch('/api/user/status');
		const data: UserStatus = await res.json();
		console.log('✅ [Dashboard] status:', data);
		setUserStatus(data);

		// If Stripe connected, fetch customers
		if (data.stripeConnected) {
		  const custRes = await fetch('/api/stripe/customers');
		  const { customers } = await custRes.json();
		  console.log('✅ [Dashboard] customers:', customers);
		  setCustomers(customers);
		}

		// If Zoom connected, fetch meetings
		if (data.zoomConnected) {
		  const meetRes = await fetch('/api/zoom/meetings');
		  const { meetings } = await meetRes.json();
		  console.log('✅ [Dashboard] meetings:', meetings);
		  setMeetings(meetings);
		}
	  } catch (err) {
		console.error('❌ [Dashboard] fetch error', err);
	  } finally {
		setLoading(false);
	  }
	}
	fetchAll();
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

	  {/* Stripe Customers */}
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
			  {customers.map(c => (
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

	  {/* Zoom Meetings */}
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
			  {meetings.map(m => (
				<tr key={m.id} className="border-t">
				  <td className="px-3 py-2">{m.topic}</td>
				  <td className="px-3 py-2">{new Date(m.start_time).toLocaleString()}</td>
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
