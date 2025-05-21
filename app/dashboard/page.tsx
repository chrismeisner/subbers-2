// File: app/dashboard/page.tsx

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface UserStatus {
  stripeConnected: boolean;
  stripeAccountId: string | null;
  stripeAccountBalance: { amount: number; currency: string } | null;
  zoomConnected: boolean;
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

interface PaymentLink {
  id: string;
  url: string;
  active: boolean;
  title: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
}

export default function DashboardPage() {
  const { status } = useSession({ required: true });

  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(false);
  const [nextStartingAfter, setNextStartingAfter] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	async function fetchAll() {
	  console.log('🔄 [Dashboard] starting fetchAll');
	  setLoading(true);
	  try {
		// 1️⃣ Fetch user status
		const resStatus = await fetch('/api/user/status');
		const statusData: UserStatus = await resStatus.json();
		console.log('✅ [Dashboard] userStatus:', statusData);
		setUserStatus(statusData);

		// 2️⃣ If Stripe is connected, fetch customers and payment links
		if (statusData.stripeConnected) {
		  await Promise.all([fetchCustomers(), fetchPaymentLinks()]);
		}

		// 3️⃣ If Zoom is connected, fetch meetings
		if (statusData.zoomConnected) {
		  await fetchMeetings();
		}
	  } catch (err) {
		console.error('❌ [Dashboard] fetchAll error', err);
	  } finally {
		setLoading(false);
		console.log('🔚 [Dashboard] fetchAll complete');
	  }
	}
	fetchAll();
  }, []);

  // Fetch Stripe customers with pagination
  async function fetchCustomers(startingAfter?: string) {
	const params = new URLSearchParams({ limit: '20' });
	if (startingAfter) params.set('starting_after', startingAfter);
	console.log(`➡️ [Dashboard] fetching /api/stripe/customers?${params}`);
	const res = await fetch(`/api/stripe/customers?${params}`);
	const { customers: newCustomers, hasMore } = (await res.json()) as {
	  customers: Customer[];
	  hasMore: boolean;
	};
	console.log('✅ [Dashboard] customers:', newCustomers, 'hasMore:', hasMore);
	setCustomers(prev =>
	  startingAfter ? [...prev, ...newCustomers] : newCustomers
	);
	setHasMoreCustomers(hasMore);
	if (newCustomers.length > 0) {
	  setNextStartingAfter(newCustomers[newCustomers.length - 1].id);
	}
  }

  // Fetch Stripe payment links
  async function fetchPaymentLinks() {
	console.log('➡️ [Dashboard] fetching /api/stripe/payment-links');
	const res = await fetch('/api/stripe/payment-links');
	const { paymentLinks: links } = (await res.json()) as {
	  paymentLinks: PaymentLink[];
	};
	console.log('✅ [Dashboard] paymentLinks:', links);
	setPaymentLinks(links);
  }

  // Fetch Zoom meetings
  async function fetchMeetings() {
	console.log('➡️ [Dashboard] fetching /api/zoom/meetings');
	const res = await fetch('/api/zoom/meetings');
	const { meetings: zoomMeetings } = (await res.json()) as {
	  meetings: Meeting[];
	};
	console.log('✅ [Dashboard] meetings:', zoomMeetings);
	setMeetings(zoomMeetings);
  }

  if (status === 'loading' || loading || !userStatus) {
	return <p className="p-4">Loading dashboard…</p>;
  }

  return (
	<div className="space-y-6">
	  <h1 className="text-2xl font-bold">Dashboard</h1>

	  {/* Stripe Status & Balance */}
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
		{userStatus.stripeConnected && (
		  userStatus.stripeAccountBalance ? (
			<p className="mt-2 text-sm text-gray-700">
			  Current Stripe balance:{' '}
			  <strong>
				{new Intl.NumberFormat('en-US', {
				  style: 'currency',
				  currency: userStatus.stripeAccountBalance.currency,
				}).format(
				  userStatus.stripeAccountBalance.amount / 100
				)}
			  </strong>
			</p>
		  ) : (
			<p className="mt-2 text-sm text-red-600">
			  Stripe balance not found
			</p>
		  )
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
			  {customers.map(c => (
				<tr key={c.id} className="border-t">
				  <td className="px-3 py-2">{c.name ?? '—'}</td>
				  <td className="px-3 py-2">{c.email ?? '—'}</td>
				  <td className="px-3 py-2 text-sm text-gray-600">{c.id}</td>
				</tr>
			  ))}
			</tbody>
		  </table>
		  {hasMoreCustomers && (
			<button
			  onClick={() => fetchCustomers(nextStartingAfter!)}
			  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			>
			  Load 20 more
			</button>
		  )}
		</div>
	  )}

	  {/* Stripe Payment Links Table */}
	  {paymentLinks.length > 0 && (
		<div className="p-4 bg-white shadow rounded">
		  <h2 className="text-xl font-semibold mb-2">
			Stripe Payment Links
		  </h2>
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
				  <td className="px-3 py-2">{pl.title ?? '—'}</td>
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
				  <td className="px-3 py-2">
					{pl.active ? 'Yes' : 'No'}
				  </td>
				  <td className="px-3 py-2 text-sm text-gray-600">
					{pl.id}
				  </td>
				</tr>
			  ))}
			</tbody>
		  </table>
		</div>
	  )}

	  {/* Zoom Status & Email */}
	  <div className="p-4 bg-white shadow rounded">
		<div className="flex items-center justify-between">
		  <span className="font-medium">Zoom:</span>
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
		{userStatus.zoomConnected && (
		  userStatus.zoomUserEmail ? (
			<p className="mt-2 text-sm text-gray-700">
			  Zoom user email: <strong>{userStatus.zoomUserEmail}</strong>
			</p>
		  ) : (
			<p className="mt-2 text-sm text-red-600">
			  Zoom email not found
			</p>
		  )
		)}
	  </div>

	  {/* Upcoming Zoom Meetings Table */}
	  {meetings.length > 0 && (
		<div className="p-4 bg-white shadow rounded">
		  <h2 className="text-xl font-semibold mb-2">
			Upcoming Zoom Meetings
		  </h2>
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
				  <td className="px-3 py-2">
					{new Date(m.start_time).toLocaleString()}
				  </td>
				  <td className="px-3 py-2 text-sm text-gray-600">
					{m.id}
				  </td>
				</tr>
			  ))}
			</tbody>
		  </table>
		</div>
	  )}
	</div>
  );
}
