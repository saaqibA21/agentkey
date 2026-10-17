"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  badgeTone?: "accent" | "purple" | "warn";
};

const items: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "⚡" },
  { href: "/dashboard/api", label: "API", icon: "🧩", badge: "New", badgeTone: "accent" },
  { href: "/dashboard/inboxes", label: "Inboxes & Channels", icon: "📬" },
  { href: "/dashboard/identity", label: "Identity & Vault", icon: "🛡️", badge: "OD-ID", badgeTone: "purple" },
  { href: "/dashboard/approvals", label: "HITL Approvals", icon: "🔒" },
  { href: "/dashboard/keys", label: "API Keys", icon: "🔑" },
  { href: "/dashboard/domains", label: "Domains & DNS", icon: "🌐" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "🔌" },
  { href: "/dashboard/admin", label: "Admin Console", icon: "👑", badge: "Live", badgeTone: "accent" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1.5 overflow-x-auto text-sm md:flex-col">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[#8BE8E3]/10 text-[#8BE8E3] border border-[#8BE8E3]/30 shadow-sm shadow-[#8BE8E3]/10 font-semibold"
                : "text-[#9BA7B4] hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base transition-transform group-hover:scale-110">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  item.badgeTone === "purple"
                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30"
                    : "bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
      <div className="my-2 border-t border-white/5 hidden md:block" />
      <Link
        href="/docs"
        className="group flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <span className="text-base">📖</span>
        <span>Developer Docs</span>
      </Link>
    </nav>
  );
}
