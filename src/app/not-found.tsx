"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="relative">
        <div className="text-9xl font-bold text-indigo-600 animate-bounce">
          404
        </div>
        <div className="absolute inset-0 text-9xl font-bold text-indigo-300 animate-pulse opacity-50">
          404
        </div>
      </div>
      <h1 className="text-4xl font-semibold text-gray-800 mt-8 animate-fade-in">
        Oops! Page Not Found
      </h1>
      <p className="text-lg text-gray-600 mt-4 text-center max-w-md animate-fade-in-delay">
        The page you're looking for seems to have wandered off. Don't worry,
        let's get you back on track.
      </p>
      <div className="mt-8 space-x-4">
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-block px-8 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Go Back
        </button>
      </div>
      <div className="mt-12">
        <svg
          className="w-32 h-32 text-indigo-400 animate-spin-slow"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
    </div>
  );
}
