// File: app/dashboard/components/UpcomingZoomMeetings.tsx
'use client';

import React from 'react';

export interface Meeting {
  id: string;
  topic: string;
  start_time: string;
}

interface Props {
  meetings: Meeting[];
}

export default function UpcomingZoomMeetings({ meetings }: Props) {
  return (
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
  );
}
