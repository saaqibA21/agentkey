"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: "accent" | "purple" | "warn" | "good";
};

const baseItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/dashboard/guide",
    label: "User Guide",
    badge: "Start",
    badgeTone: "accent",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" /><path d="M6 10h10" />
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
    href: "/dashboard/oauth",
    label: "OAuth & Connect",
    badge: "OIDC",
    badgeTone: "good",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

export function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const items = [...baseItems];
  if (isAdmin) {
    items.push({
      href: "/dashboard/admin",
      label: "Admin Console",
      badge: "Live",
      badgeTone: "good",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 8h10" /><path d="M7 12h10" /><path d="M7 16h10" />
        </svg>
      ),
    });
  }

  return (
    <nav className="flex gap-1.5 overflow-x-auto text-sm md:flex-col">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <a
            key={item.href}
            href={item.href}
            className={`group flex items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[#18191B] text-[#FAF5EE] shadow-sm font-semibold"
                : "text-[#64646A] hover:bg-black/[0.04] hover:text-[#18191B]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`shrink-0 transition-transform group-hover:scale-105 ${isActive ? "text-[#FAF5EE]" : "text-[#8C8A94] group-hover:text-[#18191B]"}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  isActive
                    ? "bg-white/20 text-[#FAF5EE]"
                    : item.badgeTone === "purple"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : item.badgeTone === "good"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-[#F2ECE1] text-[#18191B] border border-[#DDD4C2]"
                }`}
              >
                {item.badge}
              </span>
            )}
          </a>
        );
      })}

      <div className="my-2 border-t border-[#E5DEC9] hidden md:block" />

      <Link
        href="/docs"
        target="_blank"
        className="group flex items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#64646A] transition hover:bg-black/[0.04] hover:text-[#18191B]"
      >
        <div className="flex items-center gap-3">
          <svg className="h-4 w-4 shrink-0 text-[#8C8A94] transition-transform group-hover:scale-105 group-hover:text-[#18191B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M6 6h10" /><path d="M6 10h10" />
          </svg>
          <span>Developer Docs</span>
        </div>
        <svg className="h-3.5 w-3.5 text-[#8C8A94] opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17l9.2-9.2M17 17V8H8" />
        </svg>
      </Link>
    </nav>
  );
}
