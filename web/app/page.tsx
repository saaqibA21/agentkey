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

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<typeof useCases[0] | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const copyAgentId = () => {
    navigator.clipboard.writeText("agent_7f3a9e2c4b1d");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080D12] text-[#F5F3EF] selection:bg-[#8BE8E3]/20 selection:text-[#8BE8E3]">
      <SiteNav />

      {/* =========================================================================
          1. HERO — CINEMATIC VISUAL EXPERIENCE (Midnight #080D12)
         ========================================================================= */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center pt-20 pb-36 lg:pt-28 lg:pb-52">

        <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-16">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Copy & Actions */}
            <div className="lg:col-span-6 space-y-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9BA7B4]">
                Identity For AI Agents
              </p>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-[#F5F3EF] leading-[1.06]">
                Give your AI agents <br />
                <span className="mint-lavender-gradient">a real identity.</span>
              </h1>

              <p className="max-w-xl text-base sm:text-lg lg:text-xl text-[#9BA7B4] leading-relaxed">
                Secure, verifiable, and portable identities for AI agents — so they can act, access, and
                collaborate across the internet, just like humans.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-3">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-full bg-[#F5F3EF] px-8 py-4 text-sm font-semibold text-[#111A22] shadow-sm transition-all hover:bg-white hover:shadow-xl hover:shadow-white/10 active:scale-95"
                >
                  <span>Get Started Free</span>
                  <span className="text-xs">→</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-medium text-[#F5F3EF] backdrop-blur-md transition hover:bg-white/10 hover:border-white/25 active:scale-95"
                >
                  <svg className="h-4 w-4 fill-current text-[#8BE8E3]" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* Compact Trust Indicators */}
              <div className="flex flex-wrap items-center gap-7 pt-4 text-xs font-medium text-[#9BA7B4]">
                <span className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8BE8E3]/15 text-[#8BE8E3]">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Secure
                </span>
                <span className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8BE8E3]/15 text-[#8BE8E3]">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Verifiable
                </span>
                <span className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8BE8E3]/15 text-[#8BE8E3]">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Portable
                </span>
                <span className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8BE8E3]/15 text-[#8BE8E3]">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Built for AI
                </span>
              </div>
            </div>

            {/* Right Column: 3D Robot floating freely with no container */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full max-w-[700px] animate-float-slow">
                <img
                  src="/images/hero-robot-blend.png"
                  alt="AgentID 3D Robot HealthBot (Clinical AI Agent) with tilted glass credential card owned by Curelith Health Systems, permissions Read Analyze Assist"
                  className="w-full h-auto object-contain select-none drop-shadow-2xl"
                />

                {/* Floating ID Pill below robot */}
                <div className="mt-4 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-[#8BE8E3]/20 bg-[#101923]/80 px-4 py-1.5 text-xs text-[#9BA7B4] shadow-xl backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-[#8BE8E3] animate-pulse" />
                    <span>Verified Core:</span>
                    <code className="font-mono text-[#8BE8E3]">agent_7f3a9e2c4b1d</code>
                    <button
                      type="button"
                      onClick={copyAgentId}
                      className="ml-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-[#F5F3EF] hover:bg-white/15 transition flex items-center gap-1"
                    >
                      {copiedId ? "Copied" : "Copy ID"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. IDENTITY EXPLAINER SECTION (Warm Ivory #F4F1EB Background)
         ========================================================================= */}
      <section id="product" className="relative bg-[#F4F1EB] text-[#111A22] py-28 transition-colors">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-14">
            {/* Left Column: Benefits & Editorial Copy */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#64748B]">
                  More Than A Name
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl text-[#111A22] leading-[1.12]">
                  A complete identity <br />
                  for every agent.
                </h2>
                <p className="mt-4 text-base sm:text-lg text-[#55606E] leading-relaxed">
                  AgentID gives AI agents a verified digital identity with ownership, permissions, and
                  real-world connections — making them trustworthy, accountable, and ready to work anywhere.
                </p>
              </div>

              {/* 4 Vertically Stacked Benefits with Sophisticated Line SVGs */}
              <div className="space-y-6 pt-2">
                <div className="flex items-start gap-4 pb-6 border-b border-[#111A22]/[0.08]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#111A22]/[0.08] shadow-sm text-[#111A22]">
                    <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <circle cx="9" cy="10" r="2" />
                      <line x1="15" y1="8" x2="17" y2="8" />
                      <line x1="15" y1="12" x2="17" y2="12" />
                      <line x1="7" y1="16" x2="17" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111A22]">Cryptographic Identity</h3>
                    <p className="mt-1 text-sm text-[#55606E] leading-relaxed">
                      Tamper-proof and globally verifiable with immutable audit trails.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pb-6 border-b border-[#111A22]/[0.08]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#111A22]/[0.08] shadow-sm text-[#111A22]">
                    <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111A22]">Cross-Platform Access</h3>
                    <p className="mt-1 text-sm text-[#55606E] leading-relaxed">
                      Work seamlessly across apps, APIs, enterprise tools, and services.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pb-6 border-b border-[#111A22]/[0.08]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#111A22]/[0.08] shadow-sm text-[#111A22]">
                    <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111A22]">Secure Collaboration</h3>
                    <p className="mt-1 text-sm text-[#55606E] leading-relaxed">
                      Connect with human teams, enterprise systems, and peer autonomous agents.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#111A22]/[0.08] shadow-sm text-[#111A22]">
                    <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111A22]">Full Control</h3>
                    <p className="mt-1 text-sm text-[#55606E] leading-relaxed">
                      Decide where, when, and who each agent can interact with in real-time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Identity Network Ecosystem Graphic floating freely with no container */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[680px]">
                <img
                  src="/images/ecosystem-network-blend.png"
                  alt="AgentID Connected Ecosystem Network Visual"
                  className="w-full h-auto object-contain select-none"
                />
                <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                  One identity. Endless possibilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. USE CASES (Deep Midnight #080D12 / #101923)
         ========================================================================= */}
      <section id="agents" className="relative py-28 bg-[#080D12]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9BA7B4]">
                Built For Real Use Cases
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl text-[#F5F3EF] leading-[1.12]">
                From personal assistants <br className="hidden sm:inline" />
                to enterprise teams.
              </h2>
              <p className="mt-3 text-[#9BA7B4] text-base max-w-xl leading-relaxed">
                Powering the next generation of AI agents — across every industry.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-[#F5F3EF] transition hover:bg-white/10 hover:border-white/25 active:scale-95"
            >
              <span>Explore Use Cases</span>
              <span className="text-xs">→</span>
            </Link>
          </div>

          {/* 6 Image-Led Tiles with full-bleed background images */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc) => (
              <div
                key={uc.id}
                onClick={() => setSelectedUseCase(uc)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] p-6 h-64 flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:border-[#8BE8E3]/50 hover:shadow-2xl hover:shadow-[#8BE8E3]/10"
              >
                {/* Full-bleed card background image */}
                <img
                  src={uc.image}
                  alt={uc.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Dark gradient overlay for optimal text contrast and cinematic depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080D12] via-[#080D12]/70 to-[#080D12]/20 transition-opacity duration-300 group-hover:via-[#080D12]/50" />

                {/* Content overlaid directly on the background image */}
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#F5F3EF] group-hover:text-[#8BE8E3] transition-colors">
                      {uc.title}
                    </h3>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-[#F5F3EF] backdrop-blur-md transition-all group-hover:translate-x-1 group-hover:bg-[#8BE8E3] group-hover:text-[#080D12]">
                      →
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#9BA7B4] leading-relaxed group-hover:text-slate-200 transition-colors">
                    {uc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. FINAL CINEMATIC CTA (Full-bleed edge-to-edge background)
         ========================================================================= */}
      <section className="relative w-full overflow-hidden py-28 sm:py-36 lg:py-44 text-center">
        {/* Full-width Panoramic Mountain Landscape background */}
        <img
          src="/images/mountain-landscape-v2.jpg"
          alt="Panoramic twilight mountains silhouette"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Atmospheric top and bottom vignette blend into midnight #080D12 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080D12] via-[#080D12]/60 to-[#080D12]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#080D12_85%)] opacity-70" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8 space-y-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9BA7B4]">
            The Future Of AI Is Agentic
          </p>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F5F3EF] leading-[1.12]">
            Give your agents <br />
            <span className="mint-lavender-gradient">the identity they deserve.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#9BA7B4] leading-relaxed max-w-xl mx-auto">
            Real identities. Real possibilities. Sovereign multi-channel communication, zero-token OTPs,
            and tamper-evident credential delegation.
          </p>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full bg-[#F5F3EF] px-8 py-4 text-sm font-semibold text-[#111A22] shadow-xl transition-all hover:bg-white hover:scale-105 active:scale-95"
            >
              <span>Get Started Free</span>
              <span>→</span>
            </Link>

            <Link
              href="/dashboard/admin"
              className="rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-medium text-[#F5F3EF] backdrop-blur-md transition hover:bg-white/10 hover:border-white/25"
            >
              Admin Governance
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* =========================================================================
          INTERACTIVE DEMO MODAL
         ========================================================================= */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#101923] p-8 shadow-2xl">
            <button
              onClick={() => setDemoOpen(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Close demo modal"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#8BE8E3] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#8BE8E3]">
                  Interactive Verification Simulation
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#F5F3EF]">
                How AgentID Authenticates Autonomous Bots
              </h3>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-[#080D12] p-4 text-xs font-mono text-[#9BA7B4]">
                <p className="text-emerald-400">01: Bot requests login at https://internal.curelith.com</p>
                <p className="text-indigo-300">02: AgentID edge regex intercepts verification OTP: [ 8 4 9 2 0 1 ]</p>
                <p className="text-teal-300">03: Cryptographic owner check passed: Curelith Health Systems</p>
                <p className="text-[#F5F3EF]">04: Session exported to Playwright headless context (200 OK)</p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[#F5F3EF] px-5 py-2 text-xs font-semibold text-[#111A22] hover:bg-white"
                >
                  Open Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          USE CASE DETAIL MODAL
         ========================================================================= */}
      {selectedUseCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#101923] p-8 shadow-2xl">
            <button
              onClick={() => setSelectedUseCase(null)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Close modal"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-[#F5F3EF]">{selectedUseCase.title} Architecture</h3>
            <p className="mt-2 text-sm text-[#9BA7B4] leading-relaxed">{selectedUseCase.detail}</p>

            <div className="mt-6 flex justify-end">
              <Link
                href="/dashboard"
                className="rounded-full bg-[#8BE8E3] px-5 py-2 text-xs font-semibold text-[#080D12] hover:bg-[#B5F0D1]"
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
