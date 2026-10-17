"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/app/dashboard/actions";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const buttonStyles = {
  primary: "bg-teal-600 text-white shadow-sm shadow-teal-600/20 hover:bg-teal-500 hover:shadow-teal-500/30 active:scale-[0.98]",
  secondary: "border border-line bg-surface text-ink hover:bg-subtle hover:border-line/90 active:scale-[0.98]",
  danger: "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-[0.98]",
};

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-subtle hover:text-ink active:scale-95"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function Submit({
  children, variant = "primary", confirm,
}: { children: ReactNode; variant?: keyof typeof buttonStyles; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${buttonStyles[variant]}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

/** A form bound to a server action: shows the action's error, or a one-time secret it returns. */
export function ActionForm({
  action, children, submit, variant, confirm, className = "",
}: {
  action: Action; children?: ReactNode; submit: ReactNode; variant?: keyof typeof buttonStyles;
  confirm?: string; className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <Submit variant={variant} confirm={confirm}>{submit}</Submit>
      {state?.error && (
        <p role="alert" className="basis-full text-sm text-danger">{state.error}</p>
      )}
      {state?.secret && (
        <div className="basis-full rounded-lg border border-accent/40 bg-accent/5 p-3">
          <p className="text-sm font-medium">{state.secretLabel}</p>
          <p className="mt-0.5 text-xs text-muted">Copy it now. It is not shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-surface px-2 py-1.5 font-mono text-xs">
              {state.secret}
            </code>
            <CopyButton value={state.secret} />
          </div>
        </div>
      )}
    </form>
  );
}

/** Re-fetch the server-rendered page on an interval so new mail appears without a manual reload. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Live
    </span>
  );
}
