import type { ReactNode } from "react";

import { CopyButton } from "./client";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-[#0E151E]/95 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-black/25 text-[#F5F3EF] transition-all duration-150 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, lead, aside }: { title: string; lead?: string; aside?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl capitalize">{title}</h1>
        {lead && <p className="max-w-3xl text-sm leading-relaxed text-[#9BA7B4]">{lead}</p>}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2.5 self-start sm:self-auto">{aside}</div>}
    </div>
  );
}

const tones = {
  neutral: "bg-white/5 text-[#9BA7B4] border border-white/10",
  good: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold",
  warn: "bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30",
  bad: "bg-[#fb7185]/15 text-[#fb7185] border border-[#fb7185]/30",
  accent: "bg-[#8BE8E3]/15 text-[#8BE8E3] border border-[#8BE8E3]/30 font-semibold",
  purple: "bg-[#B6B8FF]/15 text-[#B6B8FF] border border-[#B6B8FF]/30 font-semibold",
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
    neutral: "hover:border-white/20",
    good: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    warn: "hover:border-amber-500/40 hover:shadow-amber-500/5",
    accent: "hover:border-[#8BE8E3]/40 hover:shadow-[#8BE8E3]/5",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E151E] p-6 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between text-[#9BA7B4]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9BA7B4]">{title}</span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#8BE8E3]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-white">{value}</div>
      {subtext && <p className="mt-1.5 text-xs text-[#9BA7B4] leading-relaxed">{subtext}</p>}
    </div>
  );
}

export function Code({ code, copy = true, title }: { code: string; copy?: boolean; title?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A1017] shadow-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
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
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-[#9BA7B4]">
      <div className="mx-auto flex justify-center mb-3 select-none">
        <img
          src="/images/mascot/agentkey-empty.png"
          alt="AgentKey Empty State Mascot"
          className="w-36 sm:w-44 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
        />
      </div>
      <p className="font-semibold text-white text-base">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm text-[#9BA7B4] leading-relaxed">{children}</div>}
    </div>
  );
}

export const inputClass =
  "rounded-xl border border-white/10 bg-[#080D12] text-white px-3.5 py-2 text-sm outline-none transition placeholder:text-[#718096] focus:border-[#8BE8E3]/50 focus:ring-2 focus:ring-[#8BE8E3]/15";

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
