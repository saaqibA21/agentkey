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
  const initial = email.charAt(0).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-[#070B0F] text-[#F5F3EF]">
      {/* Top Navbar Header - Full bleed with glass effect */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#080D12]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#8BE8E3]/25 bg-[#8BE8E3]/10 px-3.5 py-1 text-xs font-medium text-[#8BE8E3]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#8BE8E3]" />
              <span>DPDP & TRAI Active</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#B6B8FF]/25 bg-[#B6B8FF]/10 px-3.5 py-1 text-xs font-medium text-[#B6B8FF] sm:flex">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Owner Delegated ID</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[250px_1fr]">
          <aside className="md:sticky md:top-24 md:self-start space-y-6">
            <DashboardNav />

            {/* Operator profile card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E]/90 p-4.5 shadow-xl shadow-black/30 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 font-bold text-white shadow-md shadow-purple-500/25">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white" title={email}>
                    {email}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-[#9BA7B4]">Verified Operator</span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs">
                <span className="font-mono text-[10px] text-[#9BA7B4]">WORKSPACE OWNER</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="text-rose-400 transition hover:text-rose-300 hover:underline font-medium">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </aside>

          <main className="min-w-0 pb-20">{children}</main>
        </div>
      </div>
    </div>
  );
}
