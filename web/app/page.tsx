import Link from "next/link";

import { SiteFooter, SiteNav } from "@/components/site";
import { Code } from "@/components/ui";
import { publicApiUrl } from "@/lib/api";
import { snippets } from "@/lib/snippets";

const features = [
  {
    title: "An address in one call",
    body: "Create a real, receiving email inbox per agent, per task or per session. Pass a client_id and the call is idempotent.",
  },
  {
    title: "Codes arrive already parsed",
    body: "One-time codes, sign-in links and invoice fields are pulled out before your agent sees the message. It reads a few tokens, not the whole email.",
  },
  {
    title: "Works where your agent runs",
    body: "A hosted MCP endpoint for Claude, Cursor and any MCP client. Tool packs for LangChain, OpenAI Agents, LlamaIndex and CrewAI. A plain REST API for the rest.",
  },
  {
    title: "A human signs off on the risky ones",
    body: "Flag words like refund or contract and matching messages wait for a person to approve them in Slack or the dashboard before anything is sent.",
  },
  {
    title: "Built for untrusted mail",
    body: "Incoming text is fenced and flagged when it reads like instructions aimed at your agent. Attachments are never rendered, only downloaded or read as text.",
  },
  {
    title: "Your domain, your reputation",
    body: "Receiving is free on our domain. To send, connect your own domain with guided DNS records, or ask us to review your workspace.",
  },
];

const steps = [
  ["Sign in", "Use Google or GitHub. Your workspace is ready immediately."],
  ["Create a key", "Scope it to read-only if the agent only needs to receive."],
  ["Connect your agent", "Paste one command, or call the API. Your agent now has an inbox."],
];

export default function Landing() {
  const s = snippets(publicApiUrl);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5">
        <section className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-4 inline-block rounded-full border border-line px-3 py-1 text-xs text-muted">
              Free during beta
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              An inbox for every <span className="text-accent">AI agent</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Give your agent its own email address in one API call. Verification codes and sign-in links arrive
              already extracted, so the agent can finish the signup it started.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-lg bg-accent px-5 py-3 font-medium text-white hover:bg-accent-strong">
                Get an API key
              </Link>
              <Link href="/docs" className="rounded-lg border border-line bg-surface px-5 py-3 font-medium hover:bg-subtle">
                Read the docs
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted">Add it to Claude Code:</p>
            <Code code={s.claudeCode} />
            <p className="pt-2 text-sm text-muted">Or from Python:</p>
            <Code code={s.python} />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-surface p-6">
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Running in about a minute</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(([title, body], i) => (
              <li key={title} className="rounded-xl border border-line p-6">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
