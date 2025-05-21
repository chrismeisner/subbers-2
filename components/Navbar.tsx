'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
	<nav className="bg-white shadow p-4 flex justify-between items-center">
	  <div className="space-x-4">
		<Link href="/">
		  Home
		</Link>
		<Link href="/dashboard">
		  Dashboard
		</Link>
	  </div>

	  {status === 'authenticated' && (
		<div className="flex items-center space-x-4">
		  <span className="text-sm text-gray-700">
			Signed in as <strong>{session.user?.email}</strong>
		  </span>
		  <button
			onClick={() => signOut({ callbackUrl: '/login' })}
			className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
		  >
			Logout
		  </button>
		</div>
	  )}
	</nav>
  );
}
