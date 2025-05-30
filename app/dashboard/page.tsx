'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import SubscriptionPackages, { SortKey } from './components/SubscriptionPackages';
import StripeStatus from './components/StripeStatus';
import StripeCustomers from './components/StripeCustomers';
import StripePaymentLinks from './components/StripePaymentLinks';
import PurchaseHistory from './components/PurchaseHistory';
import ZoomStatus from './components/ZoomStatus';
import UpcomingZoomMeetings from './components/UpcomingZoomMeetings';

const CACHE_KEY = 'dashboardData';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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
  paymentLinkId: string | null;
}

interface SubscriptionPackageRow {
  id: string;
  createdTime: string;
  fields: {
	Title: string;
	Slug: string;
	FirstSession: string;
	Recurring: boolean;
	Frequency: string;
	RRule?: string | null;
	Price?: number | null;
	Currency?: string | null;
	Interval?: string | null;
	Status?: string | null;
	PaymentLinkURL?: string | null;
  };
}

export default function DashboardPage() {
  const { status } = useSession({ required: true });

  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [hasMorePurchases, setHasMorePurchases] = useState(false);
  const [purchasesCursor, setPurchasesCursor] = useState<string | undefined>(undefined);
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('FirstSession');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
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
	  // 1️⃣ Fetch user status
	  const statusRes = await fetch('/api/user/status').then(r => r.json());
	  setUserStatus(statusRes);

	  // 2️⃣ Fetch Stripe customers & payment links if connected
	  let custData: Customer[] = [];
	  let hasMoreCust = false;
	  let linksData: PaymentLink[] = [];

	  if (statusRes.stripeConnected) {
		const custRes = await fetch('/api/stripe/customers?limit=20').then(r => r.json());
		custData = custRes.customers;
		hasMoreCust = custRes.hasMore;

		linksData = (await fetch('/api/stripe/payment-links').then(r => r.json())).paymentLinks;
	  }
	  setCustomers(custData);
	  setHasMoreCustomers(hasMoreCust);
	  setPaymentLinks(linksData);

	  // 3️⃣ Fetch Purchase History if connected
	  let purResData: { purchases: Purchase[]; hasMore: boolean } = { purchases: [], hasMore: false };
	  if (statusRes.stripeConnected) {
		purResData = await fetch('/api/stripe/purchases?limit=100').then(r => r.json());
	  }
	  const validPurchases = purResData.purchases.filter(p => !!p.customer_email);
	  setPurchases(validPurchases);
	  setHasMorePurchases(purResData.hasMore);
	  setPurchasesCursor(validPurchases.length ? validPurchases[validPurchases.length - 1].id : undefined);

	  // 4️⃣ Fetch Zoom meetings if connected
	  let meetsData: Meeting[] = [];
	  if (statusRes.zoomConnected) {
		meetsData = (await fetch('/api/zoom/meetings').then(r => r.json())).meetings;
	  }
	  setMeetings(meetsData);

	  // 5️⃣ Fetch subscription packages
	  const pkgsRes = await fetch('/api/subscriptions/packages').then(r => r.json());
	  setSubscriptionPackages(pkgsRes.subscriptionPackages || []);

	  // 6️⃣ Cache everything with a timestamp
	  const now = Date.now();
	  setLastUpdated(now);
	  localStorage.setItem(
		CACHE_KEY,
		JSON.stringify({
		  timestamp: now,
		  userStatus: statusRes,
		  customers: custData,
		  hasMoreCust,
		  paymentLinks: linksData,
		  purchases: validPurchases,
		  hasMorePurchases: purResData.hasMore,
		  meetings: meetsData,
		  subscriptionPackages: pkgsRes.subscriptionPackages,
		})
	  );
	} catch (error) {
	  console.error('Dashboard fetchAll error', error);
	} finally {
	  setLoading(false);
	}
  }, []);

  const handleRefresh = () => fetchAll();

  const loadMorePurchases = async () => {
	if (!hasMorePurchases || !purchasesCursor) return;
	const res = await fetch(
	  `/api/stripe/purchases?limit=100&starting_after=${purchasesCursor}`
	).then(r => r.json());
	const next = (res.purchases as Purchase[]).filter(p => !!p.customer_email);
	setPurchases(old => [...old, ...next]);
	setHasMorePurchases(res.hasMore);
	if (next.length) setPurchasesCursor(next[next.length - 1].id);
  };

  const handleTriggerCron = async () => {
	await fetch('/api/scheduler/run', { method: 'POST' });
	fetchAll();
  };

  useEffect(() => {
	if (status !== 'authenticated') return;

	const force = typeof window !== 'undefined' &&
	  new URLSearchParams(window.location.search).get('forceRefresh') === '1';

	if (force) {
	  fetchAll();
	  return;
	}

	try {
	  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
	  const isFresh = cache && Date.now() - cache.timestamp < CACHE_TTL;
	  if (isFresh) {
		setLastUpdated(cache.timestamp);
		setUserStatus(cache.userStatus);
		setCustomers(cache.customers);
		setHasMoreCustomers(cache.hasMoreCust);
		setPaymentLinks(cache.paymentLinks);
		setPurchases(cache.purchases);
		setHasMorePurchases(cache.hasMorePurchases);
		setPurchasesCursor(
		  cache.purchases && cache.purchases.length
			? cache.purchases[cache.purchases.length - 1].id
			: undefined
		);
		setMeetings(cache.meetings);
		setSubscriptionPackages(cache.subscriptionPackages);
		setLoading(false);
	  } else {
		fetchAll();
	  }
	} catch {
	  fetchAll();
	}
  }, [status, fetchAll]);

  if (status === 'loading' || loading || !userStatus) {
	return <p className="p-4">Loading dashboard…</p>;
  }

  // Filter out Deleted and In Review
  const visiblePackages = subscriptionPackages.filter(
	pkg => pkg.fields.Status !== 'Deleted' && pkg.fields.Status !== 'In Review'
  );

  // Sort
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
	  {/* Header & Controls */}
	  <div className="flex items-center justify-between">
		<h1 className="text-2xl font-bold">Dashboard</h1>
		<div className="flex items-center space-x-2">
		  {lastUpdated && (
			<span className="text-sm text-gray-500">
			  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
			</span>
		  )}
		  <button onClick={handleRefresh} className="px-3 py-1 bg-blue-500 text-white rounded">
			Refresh
		  </button>
		  <button onClick={handleTriggerCron} className="px-3 py-1 bg-yellow-500 text-white rounded">
			Trigger Cron Jobs
		  </button>
		  <Link
			href="/dashboard/import-subscriptions"
			className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
		  >
			Import Subscriptions
		  </Link>
		  <Link
			href="/subscriptions/new"
			className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
		  >
			Create Subscription
		  </Link>
		</div>
	  </div>

	  {/* Sections */}
	  <SubscriptionPackages
		packages={sortedPackages}
		sortKey={sortKey}
		sortDirection={sortDirection}
		onSort={handleSort}
	  />

	  <StripeStatus userStatus={userStatus} />

	  {customers.length > 0 && (
		<StripeCustomers
		  customers={customers}
		  hasMore={hasMoreCustomers}
		  loadMore={() => {}}
		/>
	  )}

	  {paymentLinks.length > 0 && (
		<StripePaymentLinks paymentLinks={paymentLinks} />
	  )}

	  <PurchaseHistory
		purchases={purchases}
		hasMore={hasMorePurchases}
		loadMore={loadMorePurchases}
	  />

	  <ZoomStatus userStatus={userStatus} />

	  {meetings.length > 0 && (
		<UpcomingZoomMeetings meetings={meetings} />
	  )}
	</div>
  );
}
