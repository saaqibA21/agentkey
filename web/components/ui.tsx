import type { ReactNode } from "react";

import { CopyButton } from "./client";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-7 shadow-xs text-[#0E171B] transition-all duration-150 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, lead, aside }: { title: string; lead?: string; aside?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-[#0E171B] sm:text-3xl capitalize">{title}</h1>
        {lead && <p className="max-w-3xl text-sm leading-relaxed text-[#64748B]">{lead}</p>}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2.5 self-start sm:self-auto">{aside}</div>}
    </div>
  );
}

const tones = {
  neutral: "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]",
  good: "bg-[#EAFBF3] text-[#0D6E48] border border-[#B7F0D5] font-semibold",
  warn: "bg-amber-50 text-amber-800 border border-amber-200",
  bad: "bg-rose-50 text-rose-800 border border-rose-200",
  accent: "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] font-semibold",
  purple: "bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] font-semibold",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-tight ${tones[tone]}`}>
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
  icon?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "accent";
}) {
  const toneClasses = {
    neutral: "hover:border-[#CBD5E1]",
    good: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    warn: "hover:border-amber-500/40 hover:shadow-amber-500/5",
    accent: "hover:border-[#0284C7]/40 hover:shadow-sky-500/5",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between text-[#64748B]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{title}</span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#0D6E48]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-[#0E171B]">{value}</div>
      {subtext && <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">{subtext}</p>}
    </div>
  );
}

export function Code({ code, copy = true, title }: { code: string; copy?: boolean; title?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#334155] bg-[#0A1017] shadow-lg">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.04] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500/60" />
          <span className="h-2 w-2 rounded-full bg-amber-500/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          {title && <span className="ml-2 font-mono text-xs text-[#9BA7B4]">{title}</span>}
        </div>
        {copy && <CopyButton value={code} />}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#8BE8E3]/95 selection:bg-[#8BE8E3]/20">
        {code}
      </pre>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white/60 px-6 py-12 text-center text-[#64748B]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B] mb-2">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>
      <p className="font-semibold text-[#0E171B] text-sm">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-xs text-[#64748B]">{children}</div>}
    </div>
  );
}

export const inputClass =
  "rounded-xl border border-[#CBD5E1] bg-white text-[#0E171B] px-3.5 py-2 text-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15";

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
