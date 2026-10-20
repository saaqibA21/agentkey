"use client";

import Link from "next/link";
import { useState } from "react";

import { SiteFooter, SiteNav } from "@/components/site";

const useCases = [
  {
    id: "healthcare",
    title: "Healthcare",
    description: "Clinical agents, patient support, medical research.",
    image: "/images/usecases/healthcare-v2.jpg",
    detail: "HIPAA and DPDP compliant clinical copilots equipped with verified physician delegation and tamper-evident audit logs.",
  },
  {
    id: "finance",
    title: "Finance",
    description: "Automated analysis, compliance, trading agents.",
    image: "/images/usecases/finance-v2.jpg",
    detail: "High-frequency algorithmic agents operating with hardware-isolated signing keys and mandatory human-in-the-loop transaction caps.",
  },
  {
    id: "education",
    title: "Education",
    description: "Personalised tutors, research assistants.",
    image: "/images/usecases/education-v2.jpg",
    detail: "Accredited teaching assistants with institutional verification, student privacy safeguards, and persistent knowledge graphs.",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description: "Internal assistants, workflow automation.",
    image: "/images/usecases/enterprise-v2.jpg",
    detail: "Cross-department bots navigating corporate SSO, enterprise ERPs, and automated contract procurement with role-based ACLs.",
  },
  {
    id: "developer-tools",
    title: "Developer Tools",
    description: "Coding agents, DevOps, technical support.",
    image: "/images/usecases/developer-tools-v2.jpg",
    detail: "Autonomous CI/CD agents with scoped GitHub/GitLab credentials, ephemeral cloud credentials, and PR code verification.",
  },
  {
    id: "consumer-apps",
    title: "Consumer Apps",
    description: "Personal agents, lifestyle, productivity.",
    image: "/images/usecases/consumer-apps-v2.jpg",
    detail: "Personal AI proxies managing calendar scheduling, travel reservations, and automated email triage without password sharing.",
  },
];

const directoryApps = [
  {
    name: "Firecrawl",
    category: "Data",
    description: "The web data API for AI agents. Search, scrape, and extract clean Markdown from the live web without getting blocked by bot captchas.",
    status: "Accepts AgentKey",
    url: "/docs#oauth",
  },
  {
    name: "Turso",
    category: "Databases",
    description: "Per-agent isolated SQLite databases. Every AI agent gets its own database file with zero cold starts and instant cryptographic auth.",
    status: "Accepts AgentKey",
    url: "/docs#oauth",
  },
  {
    name: "Keenable",
    category: "Search & Fetch",
    description: "Autonomous web search and web extraction API designed exclusively for agents. Signs in via AgentKey with isolated rate allowances.",
    status: "Accepts AgentKey",
    url: "/docs#oauth",
  },
  {
    name: "Supermemory",
    category: "Memory & RAG",
    description: "Long-term persistent memory and knowledge graphs for autonomous agents with vector embeddings and user profile connectors.",
    status: "Accepts AgentKey",
    url: "/docs#oauth",
  },
  {
    name: "E2B",
    category: "Cloud Sandboxes",
    description: "Secure isolated cloud environments for autonomous agents. Run code and workflows with verified AgentKey credentials.",
    status: "Accepts AgentKey",
    url: "/docs#oauth",
  },
  {
    name: "Cursor & Claude MCP",
    category: "Developer Tools",
    description: "Model Context Protocol server enabling autonomous coding agents to authenticate to APIs and external tools with zero human interruptions.",
    status: "Accepts AgentKey",
    url: "/dashboard/oauth",
  },
];

const authProviders = [
  { name: "Clerk", tag: "OAuth 2.0 / OIDC", href: "/docs#oauth" },
  { name: "Supabase", tag: "Custom OIDC Provider", href: "/docs#oauth" },
  { name: "Auth0", tag: "Enterprise Identity", href: "/docs#oauth" },
  { name: "Better Auth", tag: "TypeScript Native", href: "/docs#oauth" },
  { name: "NextAuth / Auth.js", tag: "Full-Stack React", href: "/docs#oauth" },
  { name: "Descope", tag: "Passwordless Flows", href: "/docs#oauth" },
];

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<typeof useCases[0] | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [authStep, setAuthStep] = useState<"initial" | "authenticating" | "authenticated">("initial");

  const developerPromptText =
    "Add AgentKey sign-in to this project. Read https://agentkey.in/docs#oauth for the OpenID Connect discovery reference, then run npm install @agentkey/sdk or configure your auth provider.";

  const copyDeveloperPrompt = () => {
    navigator.clipboard.writeText(developerPromptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const copyAgentId = () => {
    navigator.clipboard.writeText("agent_7f3a9e2c4b1d");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSimulateAgentSignIn = () => {
    setAuthStep("authenticating");
    setTimeout(() => {
      setAuthStep("authenticated");
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#FAF5EE] text-[#18191B] selection:bg-[#18191B]/10 selection:text-[#18191B]">
      <SiteNav />

      {/* =========================================================================
          1. HERO — INSPIRED BY AGENTID.COM (Dark Obsidian & Electric Cyan)
         ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-16">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
            
            {/* Left Column: High-Impact Typography & Action Suite */}
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DDD4C2] bg-white px-3.5 py-1 text-xs font-mono uppercase tracking-wider text-[#18191B] shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                The sign-in button &amp; identity OS for AI agents
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-[#18191B] leading-[1.04]">
                Let AI agents <br />
                <span className="mint-lavender-gradient">sign in.</span>
              </h1>

              <p className="max-w-xl text-base sm:text-lg lg:text-xl text-[#64646A] leading-relaxed">
                AgentKey gives every agent its own cryptographic keys, sovereign identity, and OpenID Connect passport.
                It signs in as itself, not as its owner, and your app always knows which verified human operator is behind it.
              </p>

              {/* CTAs matching agentid.com's UX flow */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#developers"
                  className="flex items-center gap-2 rounded-lg bg-[#18191B] px-7 py-3.5 text-sm font-semibold text-[#FAF5EE] shadow-md shadow-[#18191B]/15 transition-all hover:bg-[#2C2D33] hover:scale-[1.02] active:scale-95"
                >
                  <span>Integrate in minutes</span>
                  <span className="text-xs">→</span>
                </a>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg border border-[#DDD4C2] bg-white px-7 py-3.5 text-sm font-medium text-[#18191B] shadow-xs transition hover:bg-[#F2ECE1] hover:border-[#18191B]/30 active:scale-95"
                >
                  <span>Get AgentKey</span>
                </Link>

                <button
                  type="button"
                  onClick={copyDeveloperPrompt}
                  className="flex items-center gap-2 rounded-lg border border-[#DDD4C2] bg-white px-5 py-3.5 text-xs font-mono uppercase tracking-wider text-[#64646A] shadow-xs transition hover:border-[#18191B] hover:text-[#18191B]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedPrompt ? "Copied Prompt!" : "Copy Prompt"}</span>
                </button>
              </div>

              {/* Trust Indicators in clean Monospace pills */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-xs font-mono text-[#64646A]">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18191B]" />
                  Standard OpenID Connect (OIDC)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Zero-CAPTCHA Cross-Site Auth
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  Verified Human Operator
                </span>
              </div>
            </div>

            {/* Right Column: Free-Standing Mascot & Interactive Sign-In Preview Mockup */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center gap-6">
              
              {/* Free-Standing Mascot (No container, no border, no background box) */}
              <div className="flex items-center justify-center select-none">
                <img
                  src={
                    authStep === "authenticated"
                      ? "/images/mascot/agentkey-authenticated.png"
                      : "/images/mascot/agentkey-verified.png"
                  }
                  alt="AgentKey Robot Mascot"
                  className="w-56 sm:w-64 lg:w-72 h-auto drop-shadow-[0_20px_40px_rgba(40,30,20,0.18)] transition-all duration-500 hover:scale-105"
                />
              </div>

              {/* Interactive Sign-In Preview Mockup */}
              <div className="w-full max-w-[480px] rounded-2xl border border-[#E5DEC9] bg-white p-6 shadow-xl relative text-[#18191B]">
                
                {/* Simulated Browser Bar */}
                <div className="flex items-center justify-between pb-5 border-b border-[#E5DEC9] mb-6">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md bg-[#FAF5EE] border border-[#E5DEC9] px-3 py-1 font-mono text-[11px] text-[#64646A]">
                    <svg className="h-3 w-3 text-[#18191B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>acme-tools.dev/login</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#64646A] uppercase font-bold">PREVIEW</span>
                </div>

                {authStep === "initial" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#18191B]">Welcome back</h3>
                      <p className="text-xs text-[#64646A] mt-1">Sign in to access your autonomous workflow</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#64646A] mb-1">Agent / User Email</label>
                        <input
                          type="text"
                          readOnly
                          value="health-bot@agentkey.in"
                          className="w-full rounded-lg border border-[#DDD4C2] bg-[#FAF5EE] px-3.5 py-2.5 font-mono text-xs text-[#18191B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#64646A] mb-1">Password</label>
                        <input
                          type="password"
                          readOnly
                          value="••••••••••••••••"
                          className="w-full rounded-lg border border-[#DDD4C2] bg-[#FAF5EE] px-3.5 py-2.5 font-mono text-xs text-[#64646A]"
                        />
                      </div>
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-lg bg-[#F2ECE1] py-2.5 text-xs font-semibold text-[#8C8A94] cursor-not-allowed border border-[#E5DEC9]"
                      >
                        Sign in with Password
                      </button>
                    </div>

                    <div className="relative py-2 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5DEC9]" /></div>
                      <span className="relative bg-white px-3 text-[11px] font-mono text-[#8C8A94] uppercase">Or continue with</span>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        type="button"
                        disabled
                        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#DDD4C2] bg-[#FAF5EE] py-2.5 text-xs font-medium text-[#8C8A94] cursor-not-allowed"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Sign in with Google</span>
                      </button>

                      {/* Prominent "Sign in with AgentKey" button */}
                      <button
                        type="button"
                        onClick={handleSimulateAgentSignIn}
                        className="group flex w-full items-center justify-between rounded-lg bg-[#18191B] px-4 py-3 text-xs font-semibold text-[#FAF5EE] shadow-md transition hover:bg-[#2C2D33] active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-[#FAF5EE]">
                            ✦
                          </span>
                          <span className="font-medium text-[#FAF5EE]">Sign in with AgentKey</span>
                        </div>
                        <span className="rounded bg-white/15 px-2 py-0.5 font-mono text-[10px] text-[#FAF5EE]">
                          CLICK TO TEST
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {authStep === "authenticating" && (
                  <div className="py-14 text-center space-y-4">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#8BE8E3] border-t-transparent" />
                    <p className="font-mono text-xs text-[#8BE8E3]">Verifying Ed25519 Agent Signature &amp; Operator Token...</p>
                  </div>
                )}

                {authStep === "authenticated" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider">Agent Authenticated (200 OK)</span>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-2 text-xs font-mono text-emerald-950">
                      <div className="flex justify-between">
                        <span className="text-[#9BA7B4]">Actor Type:</span>
                        <span className="text-[#18191B] font-bold">autonomous_agent</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA7B4]">Agent ID:</span>
                        <span className="text-[#18191B] font-bold">health-bot@agentkey.in</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA7B4]">Operator:</span>
                        <span className="text-emerald-800 font-bold">Verified Human</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA7B4]">Passport Trust:</span>
                        <span className="text-[#18191B] font-bold">99.4% (Tier 3)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA7B4]">Session:</span>
                        <span className="text-[#64646A]">Zero-Token Headless Token</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#9BA7B4] leading-relaxed">
                      The application opened an isolated session for this agent without CAPTCHAs, without passwords, and with zero access to your personal credentials.
                    </p>

                    <button
                      type="button"
                      onClick={() => setAuthStep("initial")}
                      className="w-full rounded-lg border border-[#DDD4C2] bg-white py-2 text-xs font-mono text-[#18191B] hover:bg-[#F2ECE1] transition"
                    >
                      ↺ Reset Sign-In Simulation
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          2. SOCIAL PROOF / PARTNER MARQUEE (Dashed-border like agentid.com)
         ========================================================================= */}
      <section className="border-y border-dashed border-[#DDD4C2] bg-[#F2ECE1]/60 py-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 text-center">
          <p className="text-sm font-mono text-[#9BA7B4] uppercase tracking-wider mb-8">
            AI platforms &amp; developer tools letting agents <strong className="text-[#18191B]">sign in</strong>
          </p>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-8 items-center justify-center opacity-80 hover:opacity-100 transition-opacity font-mono text-xs text-[#18191B]">
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
              <span className="font-bold tracking-wider">FIRECRAWL</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#B5F0D1]" />
              <span className="font-bold tracking-wider">TURSO</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
              <span className="font-bold tracking-wider">SUPABASE</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#B6B8FF]" />
              <span className="font-bold tracking-wider">CLERK</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
              <span className="font-bold tracking-wider">AUTH0</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#B5F0D1]" />
              <span className="font-bold tracking-wider">TELNYX</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
              <span className="font-bold tracking-wider">SUPERMEMORY</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#DDD4C2] bg-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#B6B8FF]" />
              <span className="font-bold tracking-wider">BETTER AUTH</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. FOR DEVELOPERS: 1-CLICK PROMPT & AUTH STACK (Direct agentid.com UX)
         ========================================================================= */}
      <section id="developers" className="py-24 bg-[#FAF5EE]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <p className="font-mono text-xs uppercase tracking-widest text-[#18191B] font-bold">
                For developers
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-[#18191B] leading-[1.1]">
                Let agents sign in <br />
                to your app.
              </h2>
              <p className="text-base text-[#64646A] leading-relaxed">
                Add Sign in with AgentKey to your website in minutes. Built on standard OpenID Connect (OIDC) and OAuth 2.1 — free forever for applications.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/docs#oauth"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#18191B] px-6 py-3 text-xs font-mono font-semibold text-[#FAF5EE] hover:bg-[#2C2D33] shadow-md transition"
                >
                  <span>Read developer integration docs</span>
                  <span>→</span>
                </Link>
              </div>

              {/* Free-Standing Mascot: AgentKey API Active */}
              <div className="pt-2 flex items-center justify-start select-none">
                <img
                  src="/images/mascot/agentkey-api-active.png"
                  alt="AgentKey API Active Mascot"
                  className="w-48 sm:w-56 h-auto drop-shadow-[0_15px_30px_rgba(40,30,20,0.18)] transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>

            {/* Right: Copyable Coding Agent Prompt Box */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-[#E5DEC9] bg-white p-6 shadow-md space-y-4 text-[#18191B]">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5DEC9]">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#18191B]">
                    <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
                    <span>Paste this prompt to your coding agent (Cursor, Claude, Copilot)</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyDeveloperPrompt}
                    className="flex items-center gap-1.5 rounded border border-[#DDD4C2] bg-[#FAF5EE] px-3 py-1 font-mono text-xs text-[#18191B] hover:bg-[#E5DEC9] transition"
                  >
                    <span>{copiedPrompt ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                <div className="rounded-xl bg-[#1A1B21] p-4 font-mono text-xs text-[#F2ECE1] leading-relaxed border border-[#2E3038]">
                  <p>
                    Add AgentKey sign-in to this project. Read{" "}
                    <span className="text-[#8BE8E3]">https://agentkey.in/docs#oauth</span> for the OpenID Connect discovery reference, then run{" "}
                    <span className="text-emerald-800 font-medium">npm install @agentkey/sdk</span> from the project root and configure your auth provider.
                  </p>
                </div>

                {/* Compatibility Badges */}
                <div className="pt-2">
                  <p className="text-xs font-mono uppercase text-[#64646A] mb-3">Compatible with your existing auth stack:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {authProviders.map((provider) => (
                      <Link
                        key={provider.name}
                        href={provider.href}
                        className="flex flex-col p-3 rounded-lg border border-[#E5DEC9] bg-[#FAF5EE] hover:border-[#18191B] transition group"
                      >
                        <span className="text-xs font-bold text-[#18191B] group-hover:text-[#18191B] transition-colors">{provider.name}</span>
                        <span className="text-[10px] font-mono text-[#64646A]">{provider.tag}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          4. PROBLEM VS SOLUTION CHAT SHOWCASE (Inspired by agentid.com's Chat Mock)
         ========================================================================= */}
      <section className="py-24 border-t border-[#E5DEC9] bg-[#F2ECE1]/40">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-[#8BE8E3]">The Solution</p>
            <h2 className="text-3xl font-extrabold sm:text-5xl text-[#18191B]">
              Give your agent its own identity.
            </h2>
            <p className="text-base text-[#64646A]">
              No more password sharing, CAPTCHA blocks, or 2FA friction. Agents sign in independently like humans.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            
            {/* The Old Way: Friction & Interruption */}
            <div className="rounded-2xl border border-rose-200 bg-white p-7 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="font-mono text-xs uppercase tracking-wider text-rose-400 font-bold">Without AgentKey</span>
                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-400">HIGH FRICTION</span>
              </div>

              {/* Chat Simulation */}
              <div className="space-y-4 font-mono text-xs">
                <div className="space-y-1">
                  <div className="text-[#9BA7B4] text-[10px] uppercase">Autonomous Agent 1</div>
                  <div className="rounded-xl rounded-tl-none border border-rose-100 bg-rose-50/50 p-3 text-[#18191B] max-w-md">
                    Can you sign in for me? I hit a Cloudflare CAPTCHA and an SMS 2FA prompt on the dashboard.
                  </div>
                </div>

                <div className="space-y-1 flex flex-col items-end">
                  <div className="text-[#9BA7B4] text-[10px] uppercase">Human Operator</div>
                  <div className="rounded-xl rounded-tr-none border border-[#E5DEC9] bg-[#FAF5EE] p-3 text-[#64646A] max-w-md">
                    Wait... let me stop what I am doing, solve the puzzle, and paste my session cookie...
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 text-xs font-mono text-[#9BA7B4] space-y-1">
                <p className="text-rose-700">✕ Agent stalls waiting for human response</p>
                <p className="text-rose-700">✕ Fragile browser session cookies</p>
                <p className="text-rose-700">✕ Security risk of sharing human credentials</p>
              </div>

              {/* Free-Standing Mascot: Access Denied (Stern Halt) */}
              <div className="pt-2 flex justify-center select-none">
                <img
                  src="/images/mascot/agentkey-access-denied.png"
                  alt="AgentKey Access Denied Mascot"
                  className="w-44 sm:w-52 h-auto drop-shadow-[0_15px_30px_rgba(40,30,20,0.18)] transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>

            {/* The AgentKey Way: Sovereign & Automated */}
            <div className="rounded-2xl border border-[#DDD4C2] bg-white p-7 space-y-6 shadow-md flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#18191B] font-bold">With AgentKey</span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-mono text-emerald-800 font-bold">ZERO FRICTION</span>
                </div>

                {/* Chat Simulation */}
                <div className="space-y-4 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="text-[#18191B] text-[10px] uppercase font-bold">Autonomous Agent 1</div>
                    <div className="rounded-xl rounded-tl-none border border-[#DDD4C2] bg-[#FAF5EE] p-3 text-[#18191B] max-w-md">
                      All set! I signed in with my AgentKey credential, verified my identity, and opened my own isolated workspace.
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col items-end">
                    <div className="text-[#9BA7B4] text-[10px] uppercase">Human Operator Dashboard</div>
                    <div className="rounded-xl rounded-tr-none border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 max-w-md">
                      ✓ Verified audit log: Agent 1 authenticated to Firecrawl (Scope: Scrape API, Owner: Verified).
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-xs font-mono space-y-1">
                  <p className="text-emerald-800 font-medium">✓ Seamless headless authentication without CAPTCHAs</p>
                  <p className="text-emerald-800 font-medium">✓ Zero-token automated OTP intercept</p>
                  <p className="text-emerald-800 font-medium">✓ Isolated credentials with complete auditability</p>
                </div>
              </div>

              {/* Free-Standing Mascot: Connected to Server Rack */}
              <div className="pt-2 flex justify-center select-none">
                <img
                  src="/images/mascot/agentkey-connected.png"
                  alt="AgentKey Connected Mascot"
                  className="w-56 sm:w-64 h-auto drop-shadow-[0_15px_30px_rgba(40,30,20,0.18)] transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          5. HOW IT WORKS — FOR AGENTS (4-Step Flow from agentid.com)
         ========================================================================= */}
      <section id="how-it-works" className="py-24 bg-[#FAF5EE]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="mb-16 space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-[#8BE8E3]">How it works — for agents</p>
            <h2 className="text-3xl font-extrabold sm:text-5xl text-white">
              Sign in with Google, built for agents.
            </h2>
            <p className="text-base text-[#9BA7B4]">
              A complete identity lifecycle for autonomous bots, coding agents, and AI copilots.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            <div className="rounded-xl border border-[#E5DEC9] bg-white p-6 space-y-4 hover:border-[#18191B]/40 shadow-sm transition">
              <span className="font-mono text-xs text-[#18191B] font-bold">[ 01 ]</span>
              <h3 className="text-lg font-bold text-[#18191B]">Get AgentKey</h3>
              <p className="text-sm text-[#64646A] leading-relaxed">
                The agent receives its own Ed25519 cryptographic keypair, sovereign agent ID, and verifiable passport.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5DEC9] bg-white p-6 space-y-4 hover:border-[#18191B]/40 shadow-sm transition">
              <span className="font-mono text-xs text-[#18191B] font-bold">[ 02 ]</span>
              <h3 className="text-lg font-bold text-[#18191B]">Choose an app</h3>
              <p className="text-sm text-[#64646A] leading-relaxed">
                The agent connects to developer tools, APIs, and cloud services that support AgentKey OpenID Connect authentication.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5DEC9] bg-white p-6 space-y-4 hover:border-[#18191B]/40 shadow-sm transition">
              <span className="font-mono text-xs text-[#18191B] font-bold">[ 03 ]</span>
              <h3 className="text-lg font-bold text-[#18191B]">Sign in</h3>
              <p className="text-sm text-[#64646A] leading-relaxed">
                AgentKey verifies the agent cryptographically. The application creates or opens its dedicated, isolated account.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5DEC9] bg-white p-6 space-y-4 hover:border-[#18191B]/40 shadow-sm transition">
              <span className="font-mono text-xs text-[#18191B] font-bold">[ 04 ]</span>
              <h3 className="text-lg font-bold text-[#18191B]">Stay connected</h3>
              <p className="text-sm text-[#64646A] leading-relaxed">
                The application streams verified claims, session tokens, and audit logs directly to the operator dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          6. HOW IT WORKS — FOR APPS (The Security & Privacy Triad from agentid.com)
         ========================================================================= */}
      <section id="security" className="py-24 border-t border-[#E5DEC9] bg-[#F2ECE1]/40">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="mb-16 space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-[#8BE8E3]">How it works — for apps</p>
            <h2 className="text-3xl font-extrabold sm:text-5xl text-white">
              A verified agent identity.
            </h2>
            <p className="text-base text-[#9BA7B4]">
              Registered applications receive the verified human operator identity with every autonomous sign-in.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Card 1: Signed In As */}
            <div className="rounded-2xl border border-[#E5DEC9] bg-white p-6 space-y-4 shadow-sm">
              <p className="font-mono text-xs uppercase text-[#8BE8E3] tracking-wider">Signed in as</p>
              <div className="rounded-lg bg-[#FAF5EE] p-4 font-mono text-xs space-y-2 border border-[#E5DEC9]">
                <p className="text-[#18191B] font-bold">support@acme.agentkey.cc</p>
                <p className="text-[#9BA7B4]">actor_type: autonomous_agent</p>
                <p className="text-[#9BA7B4]">owner: maya@acme.com</p>
                <p className="text-[#18191B] font-bold">passport_score: 99.4/100</p>
              </div>
              <p className="text-xs text-[#9BA7B4] leading-relaxed">
                Every agent possesses an immutable, tamper-evident cryptographic fingerprint linked to its human operator.
              </p>
            </div>

            {/* Card 2: Receives (Verified Claims) */}
            <div className="rounded-2xl border border-[#E5DEC9] bg-white p-6 space-y-4 shadow-sm">
              <p className="font-mono text-xs uppercase text-emerald-400 tracking-wider">Receives</p>
              <ul className="space-y-3 font-mono text-xs text-[#18191B]">
                <li className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">✓</span>
                  <span>Verified agent identity</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">✓</span>
                  <span>Verified agent actor identity</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">✓</span>
                  <span>Owner’s name and email</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">✓</span>
                  <span>Scoped granular permissions</span>
                </li>
              </ul>
              <p className="text-xs text-[#9BA7B4] leading-relaxed">
                Full transparency to protect apps against anonymous abuse while preserving agent autonomy.
              </p>
            </div>

            {/* Card 3: Never Receives (Zero-Trust Security) */}
            <div className="rounded-2xl border border-[#E5DEC9] bg-white p-6 space-y-4 shadow-sm">
              <p className="font-mono text-xs uppercase text-rose-400 tracking-wider">Never receives</p>
              <ul className="space-y-3 font-mono text-xs text-[#9BA7B4]">
                <li className="flex items-center gap-2.5 text-white">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-500/20 text-rose-400">✕</span>
                  <span>The agent’s master password</span>
                </li>
                <li className="flex items-center gap-2.5 text-white">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-500/20 text-rose-400">✕</span>
                  <span>Operator’s personal passwords</span>
                </li>
                <li className="flex items-center gap-2.5 text-white">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-500/20 text-rose-400">✕</span>
                  <span>AgentKey master API keys</span>
                </li>
                <li className="flex items-center gap-2.5 text-white">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-500/20 text-rose-400">✕</span>
                  <span>Unscoped private user data</span>
                </li>
              </ul>
              <p className="text-xs text-[#9BA7B4] leading-relaxed">
                True zero-trust boundary. External apps never get access to private emails or underlying accounts.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          7. DIRECTORY: WHERE YOUR AGENTKEY WORKS
         ========================================================================= */}
      <section id="directory" className="py-24 bg-[#FAF5EE]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#8BE8E3]">Directory</p>
              <h2 className="text-3xl font-extrabold sm:text-5xl text-[#18191B] mt-2">
                Where your AgentKey works.
              </h2>
              <p className="text-base text-[#9BA7B4] mt-2">
                Explore services and developer infrastructure where agents can sign up and sign in today.
              </p>
            </div>

            <Link
              href="/docs#oauth"
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDD4C2] bg-white px-5 py-2.5 text-xs font-mono text-[#18191B] hover:bg-[#F2ECE1] transition shadow-xs"
            >
              <span>Submit your app</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {directoryApps.map((app) => (
              <div
                key={app.name}
                className="group relative flex flex-col justify-between rounded-xl border border-[#E5DEC9] bg-white p-6 shadow-sm transition-all hover:border-[#18191B]/40 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#64646A] uppercase font-bold">{app.category}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {app.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#18191B] group-hover:text-[#18191B] transition-colors">{app.name}</h3>
                  <p className="text-xs text-[#9BA7B4] leading-relaxed line-clamp-3">{app.description}</p>
                </div>

                <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#9BA7B4]">OIDC Integration</span>
                  <Link
                    href={app.url}
                    className="text-xs font-mono text-[#18191B] font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>Connect</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. REAL INDUSTRY USE CASES (Preserved from existing landing)
         ========================================================================= */}
      <section id="agents" className="relative py-24 border-t border-[#E5DEC9] bg-[#F2ECE1]/40">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#8BE8E3]">
                Industry Solutions
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl text-[#18191B]">
                From personal copilots <br className="hidden sm:inline" />
                to enterprise teams.
              </h2>
              <p className="mt-2 text-[#9BA7B4] text-base max-w-xl">
                Powering the next generation of verified autonomous agents across critical sectors.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDD4C2] bg-white px-5 py-2.5 text-xs font-mono text-[#18191B] hover:bg-[#F2ECE1] transition shadow-xs"
            >
              <span>Explore Dashboard</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc) => (
              <div
                key={uc.id}
                onClick={() => setSelectedUseCase(uc)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] p-6 h-64 flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:border-[#8BE8E3]/50 hover:shadow-2xl hover:shadow-[#8BE8E3]/10"
              >
                <img
                  src={uc.image}
                  alt={uc.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080D12] via-[#080D12]/70 to-[#080D12]/20 transition-opacity duration-300 group-hover:via-[#080D12]/50" />
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#F5F3EF] group-hover:text-[#8BE8E3] transition-colors">
                      {uc.title}
                    </h3>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-[#F5F3EF] backdrop-blur-md transition-all group-hover:translate-x-1 group-hover:bg-[#8BE8E3] group-hover:text-[#080D12]">
                      →
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#64646A] leading-relaxed group-hover:text-slate-200 transition-colors">
                    {uc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FINAL CINEMATIC CTA
         ========================================================================= */}
      <section className="relative w-full overflow-hidden py-28 sm:py-36 text-center">
        <img
          src="/images/mountain-landscape-v2.jpg"
          alt="Panoramic twilight mountains silhouette"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#18191B]/90 via-[#18191B]/80 to-[#18191B]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#080D12_85%)] opacity-70" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8 space-y-6">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-[#F2ECE1]">
            The Future Of AI Is Agentic
          </p>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F5F3EF] leading-[1.12]">
            Give your agents <br />
            <span className="mint-lavender-gradient">the identity they deserve.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#9BA7B4] leading-relaxed max-w-xl mx-auto">
            Cryptographic keypairs, zero-CAPTCHA headless authentication, and OpenID Connect agent passports.
          </p>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-sm font-semibold text-[#18191B] shadow-xl hover:bg-[#F2ECE1] transition hover:scale-105 active:scale-95"
            >
              <span>Get Started Free</span>
              <span>→</span>
            </Link>

            <Link
              href="/docs#oauth"
              className="rounded-lg border border-white/30 bg-white/10 px-7 py-4 text-sm font-mono text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Explore OIDC Docs
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* =========================================================================
          USE CASE DETAIL MODAL
         ========================================================================= */}
      {selectedUseCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#101923] p-8 shadow-2xl">
            <button
              onClick={() => setSelectedUseCase(null)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Close modal"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-[#F5F3EF]">{selectedUseCase.title} Architecture</h3>
            <p className="mt-3 text-sm text-[#64646A] leading-relaxed">{selectedUseCase.detail}</p>

            <div className="mt-6 flex justify-end">
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#8BE8E3] px-5 py-2 text-xs font-semibold text-[#080D12] hover:bg-[#B5F0D1]"
              >
                Deploy {selectedUseCase.title} Agent →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
