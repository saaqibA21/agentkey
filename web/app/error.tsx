"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AgentKey Global Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAF5EE] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-3xl border border-[#E5DEC9] bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-5">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#18191B]">AgentKey Application Alert</h2>
        <p className="mt-2 text-xs text-[#64646A] leading-relaxed">
          {error?.message && !error.message.includes("Minified")
            ? error.message
            : "An unexpected condition was intercepted. Your identity and security context remain intact."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-full bg-[#18191B] px-5 py-2 text-xs font-semibold text-[#FAF5EE] shadow-sm transition hover:bg-black"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto rounded-full border border-[#DDD4C2] bg-white px-5 py-2 text-xs font-semibold text-[#18191B] transition hover:bg-[#F7F2EB]"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
