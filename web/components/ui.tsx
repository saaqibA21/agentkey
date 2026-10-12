import type { ReactNode } from "react";

import { CopyButton } from "./client";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, lead, aside }: { title: string; lead?: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {lead && <p className="mt-1 max-w-2xl text-sm text-muted">{lead}</p>}
      </div>
      {aside}
    </div>
  );
}

const tones = {
  neutral: "bg-subtle text-muted",
  good: "bg-accent/10 text-accent-strong",
  warn: "bg-warn/15 text-warn-strong",
  bad: "bg-danger/10 text-danger",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Code({ code, copy = true }: { code: string; copy?: boolean }) {
  return (
    <div className="relative rounded-lg border border-line bg-code">
      {copy && (
        <div className="absolute right-2 top-2">
          <CopyButton value={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 pr-16 font-mono text-[13px] leading-relaxed text-code-ink">{code}</pre>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export const inputClass =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-accent";

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
