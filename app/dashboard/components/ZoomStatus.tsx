// File: app/dashboard/components/ZoomStatus.tsx
'use client';

import React from 'react';

export interface UserStatus {
  zoomConnected: boolean;
  zoomUserEmail: string | null;
}

interface Props {
  userStatus: UserStatus;
}

export default function ZoomStatus({ userStatus }: Props) {
  return (
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
  );
}
