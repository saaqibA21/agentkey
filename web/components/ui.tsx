import type { ReactNode } from "react";

import { CopyButton } from "./client";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E5DEC9] bg-white p-6 sm:p-7 shadow-sm text-[#18191B] transition-all duration-150 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, lead, aside }: { title: string; lead?: string; aside?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-[#E5DEC9] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-[#18191B] sm:text-3xl capitalize">{title}</h1>
        {lead && <p className="max-w-3xl text-sm leading-relaxed text-[#64646A]">{lead}</p>}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2.5 self-start sm:self-auto">{aside}</div>}
    </div>
  );
}

const tones = {
  neutral: "bg-[#F2ECE1] text-[#64646A] border border-[#E5DEC9]",
  good: "bg-sky-50 text-sky-800 border border-sky-200 font-semibold",
  warn: "bg-amber-50 text-amber-800 border border-amber-200",
  bad: "bg-rose-50 text-rose-800 border border-rose-200",
  accent: "bg-[#18191B] text-[#FAF5EE] border border-[#18191B] font-semibold",
  purple: "bg-purple-50 text-purple-800 border border-purple-200 font-semibold",
  sky: "bg-sky-50 text-sky-800 border border-sky-200 font-semibold",
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
    neutral: "hover:border-[#18191B]/30",
    good: "hover:border-emerald-500/40",
    warn: "hover:border-amber-500/40",
    accent: "hover:border-[#18191B]/50",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#E5DEC9] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between text-[#64646A]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64646A]">{title}</span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5DEC9] bg-[#F2ECE1] text-[#18191B]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-[#18191B]">{value}</div>
      {subtext && <p className="mt-1.5 text-xs text-[#64646A] leading-relaxed">{subtext}</p>}
    </div>
  );
}

export function Code({ code, copy = true, title }: { code: string; copy?: boolean; title?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#2E3038] bg-[#1A1B21] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#2E3038] bg-[#15161A] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500/60" />
          <span className="h-2 w-2 rounded-full bg-amber-500/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          {title && <span className="ml-2 font-mono text-xs text-[#9BA7B4]">{title}</span>}
        </div>
        {copy && <CopyButton value={code} />}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#F2ECE1] selection:bg-white/20">
        {code}
      </pre>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DDD4C2] bg-white/60 px-6 py-10 text-center text-[#64646A]">
      <div className="mx-auto flex justify-center mb-3 select-none">
        <img
          src="/images/mascot/agentkey-empty.png"
          alt="AgentKey Empty State Mascot"
          className="w-36 sm:w-44 h-auto drop-shadow-[0_12px_24px_rgba(40,30,20,0.15)]"
        />
      </div>
      <p className="font-semibold text-[#18191B] text-base">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm text-[#64646A] leading-relaxed">{children}</div>}
    </div>
  );
}

export const inputClass =
  "rounded-xl border border-[#DDD4C2] bg-white text-[#18191B] px-3.5 py-2 text-sm outline-none transition placeholder:text-[#8C8A94] focus:border-[#18191B] focus:ring-2 focus:ring-[#18191B]/10";

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
