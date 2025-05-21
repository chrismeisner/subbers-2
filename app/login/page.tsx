'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If already signed in, redirect to dashboard
  useEffect(() => {
	if (status === 'authenticated') {
	  router.replace('/dashboard');
	}
  }, [status, router]);

  return (
	<div className="min-h-screen flex items-center justify-center bg-gray-50">
	  <div className="p-8 bg-white shadow rounded">
		<h1 className="text-2xl font-bold mb-4">Sign in</h1>
		<button
		  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
		  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
		>
		  Sign in with Google
		</button>
	  </div>
	</div>
  );
}
