"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: "accent" | "purple" | "warn";
};

const items: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    href: "/dashboard/api",
    label: "API",
    badge: "New",
    badgeTone: "accent",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    href: "/dashboard/inboxes",
    label: "Inboxes & Channels",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    href: "/dashboard/identity",
    label: "Identity & Vault",
    badge: "OD-ID",
    badgeTone: "purple",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/approvals",
    label: "HITL Approvals",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/keys",
    label: "API Keys",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/domains",
    label: "Domains & DNS",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
      </svg>
    ),
  },
  {
    href: "/dashboard/webhooks",
    label: "Webhooks",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c0-2.21 1.79-4 4-4h.78" /><path d="M6 13V9a4 4 0 0 1 7.4-2.1" /><circle cx="18" cy="17" r="3" />
      </svg>
    ),
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto text-sm md:flex-col">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center justify-between whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[#8BE8E3]/10 text-[#8BE8E3] border border-[#8BE8E3]/35 shadow-sm shadow-[#8BE8E3]/15 font-semibold"
                : "text-[#9BA7B4] hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  item.badgeTone === "purple"
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                    : "bg-[#8BE8E3]/15 text-[#8BE8E3] border border-[#8BE8E3]/30"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
      <div className="my-2 border-t border-white/[0.08] hidden md:block" />
      <Link
        href="/docs"
        className="group flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium text-[#9BA7B4] transition hover:bg-white/[0.04] hover:text-white"
      >
        <svg className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M6 6h10" /><path d="M6 10h10" />
        </svg>
        <span>Developer Docs</span>
      </Link>
    </nav>
  );
}
