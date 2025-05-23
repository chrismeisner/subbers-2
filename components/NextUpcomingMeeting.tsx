'use client';

import { useState, useEffect } from 'react';

interface Meeting {
  id: string;
  fields: {
	StartsAt: string;
	ZoomJoinUrl?: string;
  };
}

interface Props {
  slug: string;
}

export default function NextUpcomingMeeting({ slug }: Props) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
	if (!slug) return;
	setLoading(true);
	setError(null);

	fetch(`/api/subscriptions/${encodeURIComponent(slug)}/meetings/upcoming`)
	  .then((res) => {
		if (!res.ok) throw new Error(`Server returned ${res.status}`);
		return res.json();
	  })
	  .then((data: { meeting: Meeting | null }) => {
		setMeeting(data.meeting);
	  })
	  .catch((err) => {
		console.error('Error loading upcoming meeting', err);
		setError('Unable to load upcoming meeting.');
	  })
	  .finally(() => {
		setLoading(false);
	  });
  }, [slug]);

  if (loading) {
	return <p>Loading upcoming meeting…</p>;
  }
  if (error) {
	return <p className="text-red-600">{error}</p>;
  }
  if (!meeting) {
	return <p>No upcoming meetings scheduled.</p>;
  }

  const formatted = new Date(meeting.fields.StartsAt).toLocaleString();

  return (
	<table className="min-w-full table-auto">
	  <thead>
		<tr className="bg-gray-100">
		  <th className="px-3 py-2 text-left">Starts At</th>
		  <th className="px-3 py-2 text-left">Zoom Link</th>
		</tr>
	  </thead>
	  <tbody>
		<tr className="border-t">
		  <td className="px-3 py-2">{formatted}</td>
		  <td className="px-3 py-2">
			{meeting.fields.ZoomJoinUrl ? (
			  <a
				href={meeting.fields.ZoomJoinUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-600 hover:underline"
			  >
				Join Meeting
			  </a>
			) : (
			  <span className="text-gray-600">Not available</span>
			)}
		  </td>
		</tr>
	  </tbody>
	</table>
  );
}
