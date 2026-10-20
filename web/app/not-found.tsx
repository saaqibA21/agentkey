import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080D12] text-[#F5F3EF] flex flex-col justify-between selection:bg-[#8BE8E3]/20 selection:text-[#8BE8E3]">
      <SiteNav />

      <main className="mx-auto max-w-3xl px-6 py-16 text-center flex flex-col items-center">
        {/* Free-standing 404 Mascot: Lost Agent with Map and Compass */}
        <div className="select-none mb-6">
          <img
            src="/images/mascot/agentkey-404.png"
            alt="AgentKey 404 Lost Agent Mascot"
            className="w-56 sm:w-64 md:w-72 h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] transition-transform duration-500 hover:scale-105"
          />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-mono uppercase tracking-wider text-rose-400 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          404 · Destination Unreachable
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Agent Lost in Transit
        </h1>

        <p className="mt-3 text-sm sm:text-base text-[#9BA7B4] max-w-lg leading-relaxed">
          The autonomous route or passport credential you were looking for does not exist or has been relocated to another enclave.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-xl bg-[#8BE8E3] px-6 py-3 text-xs font-semibold text-[#080D12] hover:bg-[#B5F0D1] transition shadow-lg shadow-[#8BE8E3]/15"
          >
            ← Return to Home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-xs font-semibold text-white hover:bg-white/10 transition"
          >
            Open Dashboard
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
