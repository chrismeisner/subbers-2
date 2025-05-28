'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const CACHE_KEY = 'dashboardData';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour


interface UserStatus {
  stripeConnected: boolean;
  stripeAccountId: string | null;
  stripeAccountBalance: { amount: number; currency: string } | null;
  zoomConnected: boolean;
  zoomUserEmail: string | null;
}

interface Customer { id: string; name: string | null; email: string | null; }
interface Meeting { id: string; topic: string; start_time: string; }
interface PaymentLink { id: string; url: string; active: boolean; title: string | null; priceAmount: number | null; priceCurrency: string | null; }

// Purchase History shape, with product and recurring info
interface Purchase {
  id: string;
  created: number;
  customer_email: string | null;
  payment_status: string;
  productName: string | null;
  isRecurring: boolean;
  amount_total: number;
  currency: string;
  url: string | null;
}

interface SubscriptionPackage {
  id: string;
  createdTime: string;
  fields: {
	Title: string;
	Slug: string;
	FirstSession: string;
	Recurring: boolean;
	Frequency: string;
	RRule?: string | null;
	Duration?: number;
	Price?: number | null;
	Currency?: string | null;
	Interval?: string | null;
	Status?: string | null;
	PaymentLinkURL?: string | null;
  };
}

export default function DashboardPage() {
  const { status } = useSession({ required: true });
  const searchParams = useSearchParams();

  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [sortKey, setSortKey] = useState<'Created' | 'FirstSession' | 'Title' | 'Price'>('FirstSession');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: 'Created' | 'FirstSession' | 'Title' | 'Price') => {
	if (sortKey === key) {
	  setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
	} else {
	  setSortKey(key);
	  setSortDirection('asc');
	}
  };

  const fetchAll = useCallback(async () => {
	setLoading(true);
	try {
	  // 1️⃣ User status
	  const statusRes = await fetch('/api/user/status').then(r => r.json());
	  setUserStatus(statusRes);

	  // 2️⃣ Customers & payment links
	  let custData: Customer[] = [], hasMore = false, linksData: PaymentLink[] = [];
	  if (statusRes.stripeConnected) {
		const custRes = await fetch('/api/stripe/customers?limit=20').then(r => r.json());
		custData = custRes.customers;
		hasMore = custRes.hasMore;
		linksData = (await fetch('/api/stripe/payment-links').then(r => r.json())).paymentLinks;
	  }
	  setCustomers(custData);
	  setHasMoreCustomers(hasMore);
	  setPaymentLinks(linksData);

	  // 2️⃣.5️⃣ Purchase history
	  let purchasesData: Purchase[] = [];
	  if (statusRes.stripeConnected) {
		const purRes = await fetch('/api/stripe/purchases').then(r => r.json());
		purchasesData = (purRes.purchases as Purchase[]).filter(p => !!p.customer_email);
	  }
	  setPurchases(purchasesData);

	  // 3️⃣ Zoom meetings
	  let meetsData: Meeting[] = [];
	  if (statusRes.zoomConnected) {
		meetsData = (await fetch('/api/zoom/meetings').then(r => r.json())).meetings;
	  }
	  setMeetings(meetsData);

	  // 4️⃣ Subscription packages
	  const pkgsRes = await fetch('/api/subscriptions/packages').then(r => r.json());
	  setSubscriptionPackages(pkgsRes.subscriptionPackages || []);

	  // 5️⃣ Cache all
	  const now = Date.now();
	  setLastUpdated(now);
	  localStorage.setItem(
		CACHE_KEY,
		JSON.stringify({
		  timestamp: now,
		  userStatus: statusRes,
		  customers: custData,
		  hasMore,
		  paymentLinks: linksData,
		  purchases: purchasesData,
		  meetings: meetsData,
		  subscriptionPackages: pkgsRes.subscriptionPackages,
		})
	  );
	} catch (e) {
	  console.error('Dashboard fetchAll error', e);
	} finally {
	  setLoading(false);
	}
  }, []);

  useEffect(() => {
	if (status !== 'authenticated') return;
	const force = searchParams.get('forceRefresh') === '1';
	if (force) {
	  fetchAll();
	  return;
	}
	let cache: any = null;
	try {
	  cache = JSON.parse(localStorage.getItem(CACHE_KEY)!);
	} catch {}

	const fresh = cache && Date.now() - cache.timestamp < CACHE_TTL;
	if (fresh) {
	  setLastUpdated(cache.timestamp);
	  setUserStatus(cache.userStatus);
	  setCustomers(cache.customers);
	  setHasMoreCustomers(cache.hasMore);
	  setPaymentLinks(cache.paymentLinks);
	  setPurchases((cache.purchases || []).filter((p: Purchase) => !!p.customer_email));
	  setMeetings(cache.meetings);
	  setSubscriptionPackages(cache.subscriptionPackages);
	  setLoading(false);
	} else {
	  fetchAll();
	}
  }, [status, fetchAll, searchParams]);

  if (status === 'loading' || loading || !userStatus) {
	return <p className="p-4">Loading dashboard…</p>;
  }

  // Sort packages
  const visiblePackages = subscriptionPackages.filter(pkg => pkg.fields.Status !== 'Deleted');
  const sortedPackages = [...visiblePackages].sort((a, b) => {
	let cmp = 0;
	switch (sortKey) {
	  case 'Created':
		cmp = new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
		break;
	  case 'FirstSession':
		cmp = new Date(a.fields.FirstSession).getTime() - new Date(b.fields.FirstSession).getTime();
		break;
	  case 'Title':
		cmp = a.fields.Title.localeCompare(b.fields.Title);
		break;
	  case 'Price':
		cmp = (a.fields.Price || 0) - (b.fields.Price || 0);
		break;
	}
	return sortDirection === 'asc' ? cmp : -cmp;
  });

  return (
	<div className="space-y-6">
	  {/* Header */}
	  <div className="flex items-center justify-between">
		<h1 className="text-2xl font-bold">Dashboard</h1>
		<div className="flex items-center space-x-2">
		  {lastUpdated && (
			<span className="text-sm text-gray-500">
			  Last updated:{' '}
			  {new Date(lastUpdated).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			  })}
			</span>
		  )}
		  <button
			onClick={fetchAll}
			className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
		  >
			Refresh
		  </button>
		  <Link
			href="/subscriptions/new"
			className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
		  >
			Create Subscription
		  </Link>
		</div>
	  </div>

	  {/* Subscription Packages */}
	  <div className="p-4 bg-white shadow rounded">
		<h2 className="text-xl font-semibold mb-2">Subscription Packages</h2>
		<table className="min-w-full table-auto">
		  <thead>
			<tr className="bg-gray-100">
			  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleSort('Title')}>
				Title{sortKey === 'Title' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
			  </th>
			  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleSort('Created')}>
				Created{sortKey === 'Created' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
			  </th>
			  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleSort('FirstSession')}>
				First Session{sortKey === 'FirstSession' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
			  </th>
			  <th className="px-3 py-2 text-left">Recurring</th>
			  <th className="px-3 py-2 text-left">Frequency</th>
			  <th className="px-3 py-2 text-left">RRule</th>
			  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleSort('Price')}>
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
			{sortedPackages.length > 0 ? (
			  sortedPackages.map(pkg => (
				<tr key={pkg.id} className="border-t">
				  <td className="px-3 py-2">
					<Link href={`/subscriptions/${pkg.fields.Slug}`} className="text-blue-600 hover:underline">
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
			  ))
			) : (
			  <tr>
				<td colSpan={12} className="px-3 py-2 text-center text-gray-600">
				  No subscription packages found.
				</td>
			  </tr>
			)}
		  </tbody>
		</table>
	  </div>

	  {/* Stripe Status */}
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
				  <td className="px-3 py-2">{c.name || '—'}</td>
				  <td className="px-3 py-2">{c.email || '—'}</td>
				  <td className="px-3 py-2 text-sm text-gray-600">{c.id}</td>
				</tr>
			  ))}
			</tbody>
		  </table>
		  {hasMoreCustomers && (
			<button
			  onClick={fetchAll}
			  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			>
			  Load more
			</button>
		  )}
		</div>
	  )}

	  {/* Stripe Payment Links */}
	  {paymentLinks.length > 0 && (
		<div className="p-4 bg-white shadow rounded">
		  <h2 className="text-xl font-semibold mb-2">Stripe Payment Links</h2>
		  <table className="min-w-full table-auto">
			<thead>
			  <tr className="bg-gray-100">
				<th className="px-3 py-2 text-left">Title</th>
				<th className="px-3 py-2 text-left">URL</th>
				<th className="px-3 py-2 text-left">
				  Price
				</th>
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
	  )}

	  {/* Purchase History */}
	  {purchases.length > 0 && (
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
			  </tr>
			</thead>
			<tbody>
			  {purchases.map(p => (
				<tr key={p.id} className="border-t">
				  <td className="px-3 py-2">{new Date(p.created * 1000).toLocaleString()}</td>
				  <td className="px-3 py-2">{p.customer_email}</td>
				  <td className="px-3 py-2">{p.payment_status}</td>
				  <td className="px-3 py-2">{p.productName}</td>
				  <td className="px-3 py-2">{p.isRecurring ? 'Subscription' : 'One-off'}</td>
				  <td className="px-3 py-2">{new Intl.NumberFormat('en-US', {
					  style: 'currency',
					  currency: p.currency,
					}).format(p.amount_total / 100)}</td>
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
				</tr>
			  ))}
			</tbody>
		  </table>
		</div>
	  )}

	  {/* Zoom Status & Meetings */}
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
		{userStatus.zoomConnected && userStatus.zoomUserEmail && (
		  <p className="mt-2 text-sm text-gray-700">
			Zoom user email: <strong>{userStatus.zoomUserEmail}</strong>
		  </p>
		)}
	  </div>

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
