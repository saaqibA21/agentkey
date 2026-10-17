import type { ReactNode } from "react";

import { CopyButton } from "./client";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all duration-150 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, lead, aside }: { title: string; lead?: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line/60 pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {lead && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{lead}</p>}
      </div>
      {aside}
    </div>
  );
}

const tones = {
  neutral: "bg-white/5 text-[#9BA7B4] border border-white/10",
  good: "bg-[#B5F0D1]/15 text-[#B5F0D1] border border-[#B5F0D1]/30 font-semibold",
  warn: "bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30",
  bad: "bg-[#fb7185]/15 text-[#fb7185] border border-[#fb7185]/30",
  accent: "bg-[#8BE8E3]/15 text-[#8BE8E3] border border-[#8BE8E3]/30 font-semibold",
  purple: "bg-[#B6B8FF]/15 text-[#B6B8FF] border border-[#B6B8FF]/30 font-semibold",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({
  title,
  value,
  subtext,
  icon,
  tone = "neutral",
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  tone?: "neutral" | "good" | "warn" | "accent";
}) {
  const toneClasses = {
    neutral: "hover:border-line hover:shadow-sm",
    good: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    warn: "hover:border-amber-500/40 hover:shadow-amber-500/5",
    accent: "hover:border-teal-500/40 hover:shadow-teal-500/5",
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{title}</span>
        {icon && <span className="text-lg p-1.5 rounded-lg bg-subtle">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{value}</div>
      {subtext && <p className="mt-1 text-xs text-muted leading-tight">{subtext}</p>}
    </div>
  );
}

export function Code({ code, copy = true }: { code: string; copy?: boolean }) {
  return (
    <div className="relative rounded-xl border border-line bg-code shadow-sm">
      {copy && (
        <div className="absolute right-2.5 top-2.5">
          <CopyButton value={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 pr-16 font-mono text-[13px] leading-relaxed text-code-ink">{code}</pre>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-subtle/30 px-6 py-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-muted mb-2">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>
      <p className="font-semibold text-ink text-sm">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-xs text-muted">{children}</div>}
    </div>
  );
}

export const inputClass =
  "rounded-xl border border-line bg-surface px-3.5 py-2 text-sm outline-none transition placeholder:text-muted/60 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15";

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
