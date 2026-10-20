"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AgentKey Dashboard Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-3xl border border-[#E5DEC9] bg-[#FAF5EE] p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-5">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#18191B]">Dashboard View Resumed</h2>
        <p className="mt-2 text-xs text-[#64646A] leading-relaxed">
          {error?.message && !error.message.includes("Minified")
            ? error.message
            : "An unexpected condition occurred while rendering this workspace view. The session has been safely preserved."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-full bg-[#18191B] px-5 py-2 text-xs font-semibold text-[#FAF5EE] shadow-sm transition hover:bg-black"
          >
            Retry View
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto rounded-full border border-[#DDD4C2] bg-white px-5 py-2 text-xs font-semibold text-[#18191B] transition hover:bg-[#F7F2EB]"
          >
            Refresh Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
