"use client";

import Link from "next/link";
import { useState } from "react";

export function Logo({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDarkCanvas = variant === "dark";
  return (
    <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
      <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${
        isDarkCanvas
          ? "border-[#0D6E48]/30 bg-gradient-to-b from-[#134E3C] to-[#0A2920] shadow-sm shadow-[#0D6E48]/20"
          : "border-[#8BE8E3]/35 bg-gradient-to-b from-[#141F2B] to-[#080D12] shadow-md shadow-[#8BE8E3]/15"
      }`}>
        <svg viewBox="0 0 32 32" fill="none" className="h-4.5 w-4.5">
          <defs>
            <linearGradient id="bagents-brand-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8BE8E3" />
              <stop offset="0.5" stopColor="#B5F0D1" />
              <stop offset="1" stopColor="#B6B8FF" />
            </linearGradient>
          </defs>
          {/* Compass Star / Diamond Mark */}
          <path
            d="M16 3 L19.5 12.5 L29 16 L19.5 19.5 L16 29 L12.5 19.5 L3 16 L12.5 12.5 Z"
            fill="url(#bagents-brand-mark)"
          />
          <circle cx="16" cy="16" r="2" fill={isDarkCanvas ? "#0A2920" : "#080D12"} />
        </svg>
      </div>
      <span className={`text-lg font-bold tracking-tight ${isDarkCanvas ? "text-[#0E171B]" : "text-[#F5F3EF]"}`}>
        B<span className={isDarkCanvas ? "text-[#0D6E48]" : "text-[#8BE8E3]"}>AGENTS</span>
      </span>
    </Link>
  );
}


export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 transition-colors">
      {/* Top Announcement Banner (Inspired by agentid.com) */}
      <div className="border-b border-white/[0.08] bg-[#060A0E] text-xs py-2 px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-[#8BE8E3]/15 text-[#8BE8E3] border border-[#8BE8E3]/30 font-semibold">
              NOW LIVE
            </span>
            <span className="text-[#9BA7B4] text-[13px] hidden sm:inline">
              Standard OpenID Connect (OIDC) &amp; Verifiable Agent Passports for AI Apps
            </span>
          </div>
          <Link href="/docs#oauth" className="flex items-center gap-1.5 text-xs font-mono text-[#8BE8E3] hover:underline">
            <span>[ Directory ] Find apps that accept AgentID</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      <div className="border-b border-white/[0.06] bg-[#080D12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 text-xs font-mono uppercase tracking-wider text-[#9BA7B4] md:flex">
            <Link href="/#how-it-works" className="transition hover:text-[#8BE8E3]">
              How it works
            </Link>
            <Link href="/#developers" className="transition hover:text-[#8BE8E3]">
              For developers
            </Link>
            <Link href="/#security" className="transition hover:text-[#8BE8E3]">
              Security
            </Link>
            <Link href="/#directory" className="transition hover:text-[#8BE8E3]">
              Directory
            </Link>
            <Link href="/docs" className="transition hover:text-[#8BE8E3]">
              Docs
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/docs#oauth"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono text-[#9BA7B4] transition hover:bg-white/10 hover:text-white"
            >
              <span>Add AgentID</span>
              <span className="text-xs">→</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-[#8BE8E3] px-5 py-2 text-xs font-semibold text-[#080D12] shadow-sm transition-all hover:bg-[#B5F0D1] hover:shadow-lg hover:shadow-[#8BE8E3]/15 active:scale-95"
            >
              <span>Dashboard</span>
              <span className="text-xs">→</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-white/[0.08] bg-[#080D12] px-6 py-5 md:hidden space-y-4">
          <div className="flex flex-col gap-3 font-mono text-xs uppercase tracking-wider text-[#9BA7B4]">
            <Link href="/#how-it-works" onClick={() => setMobileOpen(false)} className="hover:text-[#8BE8E3]">How it works</Link>
            <Link href="/#developers" onClick={() => setMobileOpen(false)} className="hover:text-[#8BE8E3]">For developers</Link>
            <Link href="/#security" onClick={() => setMobileOpen(false)} className="hover:text-[#8BE8E3]">Security</Link>
            <Link href="/#directory" onClick={() => setMobileOpen(false)} className="hover:text-[#8BE8E3]">Directory</Link>
            <Link href="/docs" onClick={() => setMobileOpen(false)} className="hover:text-[#8BE8E3]">Docs</Link>
            <Link href="/docs#oauth" onClick={() => setMobileOpen(false)} className="hover:text-[#8BE8E3]">Add AgentID</Link>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8BE8E3] px-5 py-2.5 text-xs font-semibold text-[#080D12]"
          >
            <span>Open Dashboard</span>
            <span>→</span>
          </Link>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#080D12] py-14 text-sm text-[#9BA7B4]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-xs text-[#9BA7B4]">
            Real identities. Real possibilities. Sovereign multi-channel AI identity platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
          <Link href="/#product" className="transition hover:text-[#F5F3EF]">Product</Link>
          <Link href="/#agents" className="transition hover:text-[#F5F3EF]">Agents</Link>
          <Link href="/docs" className="transition hover:text-[#F5F3EF]">Developers</Link>
          <Link href="/#pricing" className="transition hover:text-[#F5F3EF]">Pricing</Link>
          <Link href="/#resources" className="transition hover:text-[#F5F3EF]">Resources</Link>
          <Link href="/docs" className="transition hover:text-[#F5F3EF]">Privacy</Link>
          <Link href="/docs" className="transition hover:text-[#F5F3EF]">Terms</Link>
          <span className="text-slate-600">© 2026 BAGENTS Inc. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
