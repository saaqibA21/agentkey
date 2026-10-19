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
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8 bg-[#080D12] text-[#F5F3EF]">
      {/* Top Header Status Pill */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#8BE8E3]/20 bg-[#8BE8E3]/10 px-3 py-1 text-xs font-medium text-[#8BE8E3]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#8BE8E3]" />
            <span>DPDP & TRAI Pipes Active</span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#B6B8FF]/20 bg-[#B6B8FF]/10 px-3 py-1 text-xs font-medium text-[#B6B8FF] sm:flex">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Owner Delegated ID</span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start space-y-6">
          <DashboardNav />

          {/* User profile card */}
          <div className="glass-card rounded-2xl p-4 shadow-xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 font-bold text-white shadow-sm shadow-purple-500/20">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink" title={email}>
                  {email}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-muted">Operator (Verified)</span>
                </div>
              </div>
            </div>

            <div className="mt-3.5 border-t border-line/60 pt-3 flex items-center justify-between text-xs">
              <span className="font-mono text-[10px] text-muted">WORKSPACE OWNER</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-danger hover:underline font-medium transition">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
