// File: app/payment-links/[id]/page.tsx
'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Subscriber {
  sessionId: string;
  created: number;      // UNIX timestamp
  customerId: string | null;
  customerEmail: string | null;
  paymentStatus: string;
  subscriptionId: string | null;
  amountTotal: number;
  currency: string;
}

export default function PaymentLinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
	if (!id) return;

	setLoading(true);
	fetch(`/api/stripe/payment-links/${encodeURIComponent(id)}/subscribers`)
	  .then(async (res) => {
		if (!res.ok) {
		  const json = await res.json().catch(() => ({}));
		  throw new Error(json.error || "Failed to load subscribers");
		}
		return res.json();
	  })
	  .then((data: { subscribers: Subscriber[] }) => {
		setSubscribers(data.subscribers);
	  })
	  .catch((err) => {
		console.error("[PaymentLinkDetail] Error:", err);
		setError(err.message);
	  })
	  .finally(() => {
		setLoading(false);
	  });
  }, [id]);

  return (
	<div className="container mx-auto p-4 space-y-4">
	  <button
		onClick={() => router.push("/dashboard")}
		className="text-blue-600 hover:underline"
	  >
		← Back to Dashboard
	  </button>

	  <h1 className="text-2xl font-bold">
		Payment Link Details:{" "}
		<span className="text-indigo-600">{id}</span>
	  </h1>

	  {loading && <p>Loading subscribers…</p>}
	  {error && <p className="text-red-600">Error: {error}</p>}

	  {!loading && !error && (
		<div className="overflow-x-auto bg-white shadow rounded">
		  <table className="min-w-full table-auto">
			<thead>
			  <tr className="bg-gray-100">
				<th className="px-3 py-2 text-left">Created</th>
				<th className="px-3 py-2 text-left">Customer Email</th>
				<th className="px-3 py-2 text-left">Customer ID</th>
				<th className="px-3 py-2 text-left">Payment Status</th>
				<th className="px-3 py-2 text-left">Subscription ID</th>
				<th className="px-3 py-2 text-left">Amount</th>
				<th className="px-3 py-2 text-left">Session ID</th>
			  </tr>
			</thead>
			<tbody>
			  {subscribers.length > 0 ? (
				subscribers.map((s) => (
				  <tr key={s.sessionId} className="border-t">
					<td className="px-3 py-2">
					  {new Date(s.created * 1000).toLocaleString()}
					</td>
					<td className="px-3 py-2">{s.customerEmail || "—"}</td>
					<td className="px-3 py-2 text-sm text-gray-600">
					  {s.customerId || "—"}
					</td>
					<td className="px-3 py-2">{s.paymentStatus}</td>
					<td className="px-3 py-2 text-sm text-gray-600">
					  {s.subscriptionId || "—"}
					</td>
					<td className="px-3 py-2">
					  {new Intl.NumberFormat("en-US", {
						style: "currency",
						currency: s.currency,
					  }).format(s.amountTotal / 100)}
					</td>
					<td className="px-3 py-2 text-sm text-gray-600">
					  {s.sessionId}
					</td>
				  </tr>
				))
			  ) : (
				<tr>
				  <td
					colSpan={7}
					className="px-3 py-2 text-center text-gray-600"
				  >
					No subscribers found for this payment link.
				  </td>
				</tr>
			  )}
			</tbody>
		  </table>
		</div>
	  )}
	</div>
  );
}
