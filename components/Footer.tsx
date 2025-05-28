'use client';

import Link from 'next/link';

export default function Footer() {
  return (
	<footer
	  role="contentinfo"
	  className="bg-gray-100 text-gray-600 py-6 px-4"
	>
	  <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
		<p className="text-sm">
		  &copy; {new Date().getFullYear()} Subbers. All rights reserved.
		</p>
		<nav aria-label="Footer navigation">
		  <ul className="flex space-x-4 text-sm">
			<li>
			  <Link href="/privacy" className="hover:underline">
				Privacy Policy
			  </Link>
			</li>
			<li>
			  <Link href="/terms" className="hover:underline">
				Terms of Service
			  </Link>
			</li>
			<li>
			  <Link href="/contact" className="hover:underline">
				Contact
			  </Link>
			</li>
		  </ul>
		</nav>
	  </div>
	</footer>
  );
}
