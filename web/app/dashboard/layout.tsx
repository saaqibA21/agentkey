import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth, signOut } from "@/auth";
import { DashboardNav } from "@/components/nav";
import { Logo } from "@/components/site";

export const metadata = { title: "Dashboard · AgentKey" };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const email = session.user.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "S";

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdmin = Boolean(email && adminEmails.length > 0 && adminEmails.includes(email.toLowerCase()));

  return (
    <div className="min-h-screen w-full bg-[#FAF5EE] text-[#18191B] flex flex-col">
      {/* Full-bleed Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E5DEC9] bg-[#FAF5EE]/95 backdrop-blur-xl shadow-xs">
        <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 lg:gap-10">
            <Logo variant="light" />

            {/* Search Input Bar (Mockup Style with ⌘ K) */}
            <div className="hidden md:flex items-center">
              <div className="relative flex items-center w-72 lg:w-96">
                <svg
                  className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8C8A94]"
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
                  className="w-full rounded-full border border-[#DDD4C2] bg-white py-1.5 pl-10 pr-12 text-xs text-[#18191B] placeholder-[#8C8A94] shadow-xs transition focus:border-[#18191B] focus:outline-none"
                />
                <kbd className="pointer-events-none absolute right-3 rounded border border-[#DDD4C2] bg-[#F2ECE1] px-1.5 py-0.5 text-[10px] font-mono text-[#64646A]">
                  ⌘ K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#DDD4C2] bg-white text-[#64646A] transition hover:text-[#18191B] hover:border-[#18191B]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>

            {/* Profile Circle */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DDD4C2] bg-[#18191B] font-semibold text-xs text-[#FAF5EE] shadow-sm">
              {initial}
            </div>
          </div>
        </div>
      </header>

      {/* Full-width Body: Left Sidebar + Fluid Main View */}
      <div className="flex flex-1 w-full">
        {/* Fixed / Sticky Full-Height Left Sidebar */}
        <aside className="hidden md:flex w-64 xl:w-72 shrink-0 flex-col justify-between border-r border-[#E5DEC9] bg-[#FAF5EE]/70 backdrop-blur-xl px-4 py-6 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <DashboardNav isAdmin={isAdmin} />

          <div className="space-y-4 pt-6">
            {/* Operator Profile Card */}
            <div className="rounded-2xl border border-[#E5DEC9] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#18191B] font-bold text-[#FAF5EE] text-sm">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#18191B]" title={email}>
                    {email}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span className="text-[11px] text-[#64646A]">Operator (Verified)</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[#E5DEC9] pt-2.5 text-xs">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8C8A94]">
                  {isAdmin ? "WORKSPACE: ADMIN" : "WORKSPACE: OWNER"}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="text-[#64646A] text-xs transition hover:text-rose-600 font-medium">
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            {/* Footer Motto */}
            <div className="px-2 text-[11px] text-[#8C8A94] flex items-center justify-center gap-2">
              <span>Build</span>
              <span>·</span>
              <span>Connect</span>
              <span>·</span>
              <span>Automate</span>
            </div>
          </div>
        </aside>

        {/* Fluid Main Content Area (Spans remaining screen width) */}
        <main className="flex-1 min-w-0 w-full p-6 lg:p-8 xl:p-10 pb-24 space-y-6 bg-[#FAF5EE]">
          {children}
        </main>
      </div>
    </div>
  );
}
