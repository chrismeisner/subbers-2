'use client';

import { SessionProvider } from 'next-auth/react';
import Navbar from './Navbar';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
	<SessionProvider>
	  <div className="flex flex-col min-h-screen">
		<Navbar />
		<main className="flex-grow container mx-auto p-4">
		  {children}
		</main>
	  </div>
	</SessionProvider>
  );
}
