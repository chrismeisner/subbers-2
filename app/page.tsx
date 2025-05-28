// File: app/page.tsx

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <section
        role="banner"
        className="max-w-2xl text-center py-16"
      >
        <h1 className="text-5xl font-extrabold mb-4">
          Welcome to Subbers
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Easily manage your subscription packages, collect payments, and schedule sessions—all in one place.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
          >
            View Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
