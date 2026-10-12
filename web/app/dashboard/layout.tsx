import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth, signOut } from "@/auth";
import { Logo } from "@/components/site";

export const metadata = { title: "Dashboard" };

const nav = [
  ["/dashboard", "Overview"],
  ["/dashboard/inboxes", "Inboxes"],
  ["/dashboard/keys", "API keys"],
  ["/dashboard/domains", "Domains"],
  ["/dashboard/approvals", "Approvals"],
  ["/dashboard/webhooks", "Webhooks"],
] as const;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-6 md:grid-cols-[190px_1fr]">
      <aside className="md:sticky md:top-6 md:self-start">
        <Logo />
        <nav className="mt-6 flex gap-1 overflow-x-auto text-sm md:flex-col">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-muted hover:bg-subtle hover:text-ink">
              {label}
            </Link>
          ))}
          <Link href="/docs" className="whitespace-nowrap rounded-lg px-3 py-2 text-muted hover:bg-subtle hover:text-ink">
            Docs
          </Link>
        </nav>
        <div className="mt-6 hidden border-t border-line pt-4 text-xs text-muted md:block">
          <p className="truncate" title={session.user.email ?? ""}>{session.user.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="mt-1 underline-offset-2 hover:text-ink hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 pb-16">{children}</main>
    </div>
  );
}
