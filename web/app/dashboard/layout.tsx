import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth, signOut } from "@/auth";
import { DashboardNav } from "@/components/nav";
import { Logo } from "@/components/site";

export const metadata = { title: "Dashboard · BAGENTS" };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const email = session.user.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "S";

  const adminEmails = (process.env.ADMIN_EMAILS ?? "saaqibheroindia@gmail.com")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdmin = Boolean(email && adminEmails.includes(email.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#070B0F] text-[#F5F3EF]">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#080D12]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Logo />
            
            {/* Search Input Bar (Mockup Style with ⌘ K) */}
            <div className="hidden lg:flex items-center">
              <div className="relative flex items-center w-80">
                <svg
                  className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#718096]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search agents, tools, docs..."
                  readOnly
                  className="w-full rounded-full border border-white/[0.08] bg-[#0E151E]/90 py-1.5 pl-10 pr-12 text-xs text-white placeholder-[#718096] shadow-inner transition focus:border-[#8BE8E3]/50 focus:outline-none"
                />
                <kbd className="pointer-events-none absolute right-3 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-[#9BA7B4]">
                  ⌘ K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>DPDP &amp; TRAI Pipes Active</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Owner Delegated ID</span>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0E151E] text-[#9BA7B4] transition hover:text-white hover:border-white/20"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#8BE8E3]" />
            </button>

            {/* Profile Circle */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8BE8E3]/35 bg-gradient-to-tr from-[#132A26] to-[#0A1A17] font-semibold text-xs text-[#8BE8E3] shadow-sm">
              {initial}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[240px_1fr] lg:grid-cols-[250px_1fr]">
          <aside className="md:sticky md:top-20 md:self-start space-y-5">
            <DashboardNav isAdmin={isAdmin} />

            {/* Operator profile card matching mockup */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E]/95 p-4 shadow-xl shadow-black/30 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#132A26] to-[#1F3D38] border border-[#8BE8E3]/30 font-bold text-[#8BE8E3] text-sm">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white" title={email}>
                    {email}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-[#9BA7B4]">Operator (Verified)</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2.5 text-xs">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#718096]">
                  {isAdmin ? "WORKSPACE: ADMIN" : "WORKSPACE: OWNER"}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="text-[#9BA7B4] text-xs transition hover:text-rose-400">
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            {/* Mini Footer / Motto */}
            <div className="px-2 pt-2 text-[11px] text-[#718096] flex items-center gap-2">
              <span>Build</span>
              <span>·</span>
              <span>Connect</span>
              <span>·</span>
              <span>Automate</span>
            </div>
          </aside>

          <main className="min-w-0 pb-20">{children}</main>
        </div>
      </div>
    </div>
  );
}
