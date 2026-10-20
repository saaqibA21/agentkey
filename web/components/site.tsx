"use client";

import Link from "next/link";
import { useState } from "react";

export function Logo({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDarkCanvas = variant === "dark";
  return (
    <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
      <div className="relative flex h-8 w-8 items-center justify-center transition-transform duration-300 group-hover:scale-105 select-none shrink-0">
        <img
          src="/images/agentkey-icon.png"
          alt="AgentKey Emblem"
          className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(40,35,30,0.12)]"
        />
      </div>
      <span className={`text-lg font-bold tracking-tight ${isDarkCanvas ? "text-white" : "text-[#18191B]"}`}>
        Agent<span className={isDarkCanvas ? "text-slate-300" : "text-[#35343A]"}>Key</span>
      </span>
    </Link>
  );
}


export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 transition-colors">
      <div className="border-b border-[#E5DEC9] bg-[#FAF5EE]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 text-xs font-mono uppercase tracking-wider text-[#64646A] md:flex">
            <Link href="/#how-it-works" className="transition hover:text-[#18191B]">
              How it works
            </Link>
            <Link href="/#developers" className="transition hover:text-[#18191B]">
              For developers
            </Link>
            <Link href="/#security" className="transition hover:text-[#18191B]">
              Security
            </Link>
            <Link href="/#solutions" className="transition hover:text-[#18191B]">
              Directory
            </Link>
            <Link href="/docs" className="transition hover:text-[#18191B]">
              Docs
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/docs#oauth"
              className="flex items-center gap-1.5 rounded-lg border border-[#DDD4C2] bg-white px-4 py-2 text-xs font-mono text-[#64646A] transition hover:border-[#18191B] hover:text-[#18191B]"
            >
              <span>Add AgentKey</span>
              <span className="text-xs">→</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-[#18191B] px-5 py-2 text-xs font-semibold text-[#FAF5EE] shadow-sm transition-all hover:bg-[#2C2D33] active:scale-95"
            >
              <span>Dashboard</span>
              <span className="text-xs">→</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD4C2] bg-white text-[#18191B] md:hidden"
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
        <div className="border-b border-[#E5DEC9] bg-[#FAF5EE] px-6 py-5 md:hidden space-y-4">
          <div className="flex flex-col gap-3 font-mono text-xs uppercase tracking-wider text-[#64646A]">
            <Link href="/#how-it-works" onClick={() => setMobileOpen(false)} className="hover:text-[#18191B]">How it works</Link>
            <Link href="/#developers" onClick={() => setMobileOpen(false)} className="hover:text-[#18191B]">For developers</Link>
            <Link href="/#security" onClick={() => setMobileOpen(false)} className="hover:text-[#18191B]">Security</Link>
            <Link href="/#solutions" onClick={() => setMobileOpen(false)} className="hover:text-[#18191B]">Solutions</Link>
            <Link href="/docs" onClick={() => setMobileOpen(false)} className="hover:text-[#18191B]">Docs</Link>
            <Link href="/docs#oauth" onClick={() => setMobileOpen(false)} className="hover:text-[#18191B]">Add AgentKey</Link>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#18191B] px-5 py-2.5 text-xs font-semibold text-[#FAF5EE]"
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
    <footer className="border-t border-[#E5DEC9] bg-[#FAF5EE] py-14 text-sm text-[#64646A]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-xs text-[#64646A]">
            Real identities. Real possibilities. Sovereign multi-channel AI identity &amp; authentication platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
          <Link href="/#how-it-works" className="transition hover:text-[#18191B]">How it works</Link>
          <Link href="/#developers" className="transition hover:text-[#18191B]">Developers</Link>
          <Link href="/#solutions" className="transition hover:text-[#18191B]">Solutions</Link>
          <Link href="/docs#oauth" className="transition hover:text-[#18191B]">OAuth &amp; OIDC</Link>
          <Link href="/docs" className="transition hover:text-[#18191B]">Docs</Link>
          <Link href="/docs" className="transition hover:text-[#18191B]">Privacy</Link>
          <Link href="/docs" className="transition hover:text-[#18191B]">Terms</Link>
          <span className="text-[#8C8A94]">© 2026 AgentKey Inc. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
