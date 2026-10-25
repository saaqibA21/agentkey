import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF5EE] text-[#18191B] flex flex-col justify-between selection:bg-[#18191B]/10 selection:text-[#18191B]">
      <SiteNav />

      <main className="mx-auto max-w-3xl px-6 py-16 text-center flex flex-col items-center">
        {/* Free-standing 404 Mascot: Lost Agent with Map and Compass */}
        <div className="select-none mb-6">
          <img
            src="/images/mascot/agentkey-404.png"
            alt="AgentKey 404 Lost Agent Mascot"
            loading="lazy"
            decoding="async"
            className="w-56 sm:w-64 md:w-72 h-auto drop-shadow-[0_20px_40px_rgba(40,30,20,0.15)] transition-transform duration-500 hover:scale-105"
          />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3.5 py-1 text-xs font-mono uppercase tracking-wider text-rose-800 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
          404 · Destination Unreachable
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#18191B]">
          Agent Lost in Transit
        </h1>

        <p className="mt-3 text-sm sm:text-base text-[#64646A] max-w-lg leading-relaxed">
          The autonomous route or passport credential you were looking for does not exist or has been relocated to another enclave.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-xl bg-[#18191B] px-6 py-3 text-xs font-semibold text-[#FAF5EE] hover:bg-[#2C2D33] transition shadow-md"
          >
            ← Return to Home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#DDD4C2] bg-white px-6 py-3 text-xs font-semibold text-[#18191B] hover:bg-[#F2ECE1] transition"
          >
            Open Dashboard
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
