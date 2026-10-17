"use client";

import Link from "next/link";
import { useState } from "react";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#B5F0D1] via-[#8BE8E3] to-[#B6B8FF] text-[#080D12] shadow-sm shadow-[#8BE8E3]/20 transition-transform duration-200 group-hover:scale-105">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-[#F5F3EF]">
        Agent<span className="text-[#8BE8E3]">ID</span>
      </span>
    </Link>
  );
}

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080D12]/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#9BA7B4] md:flex">
          <Link href="/#product" className="transition hover:text-[#F5F3EF]">
            Product
          </Link>
          <Link href="/#agents" className="transition hover:text-[#F5F3EF]">
            Agents
          </Link>
          <Link href="/docs" className="transition hover:text-[#F5F3EF]">
            Developers
          </Link>
          <Link href="/#pricing" className="transition hover:text-[#F5F3EF]">
            Pricing
          </Link>
          <Link href="/#resources" className="transition hover:text-[#F5F3EF]">
            Resources
          </Link>
          <Link href="/dashboard/admin" className="text-[#8BE8E3] transition hover:text-[#B5F0D1]">
            Admin
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full bg-[#F5F3EF] px-5 py-2 text-sm font-semibold text-[#111A22] shadow-sm transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 active:scale-95"
          >
            <span>Get Started</span>
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

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-white/[0.08] bg-[#080D12] px-6 py-5 md:hidden space-y-4">
          <div className="flex flex-col gap-3 text-sm font-medium text-[#9BA7B4]">
            <Link href="/#product" onClick={() => setMobileOpen(false)} className="hover:text-white">Product</Link>
            <Link href="/#agents" onClick={() => setMobileOpen(false)} className="hover:text-white">Agents</Link>
            <Link href="/docs" onClick={() => setMobileOpen(false)} className="hover:text-white">Developers</Link>
            <Link href="/#pricing" onClick={() => setMobileOpen(false)} className="hover:text-white">Pricing</Link>
            <Link href="/#resources" onClick={() => setMobileOpen(false)} className="hover:text-white">Resources</Link>
            <Link href="/dashboard/admin" onClick={() => setMobileOpen(false)} className="text-[#8BE8E3]">Admin Console</Link>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#F5F3EF] px-5 py-2.5 text-sm font-semibold text-[#111A22]"
          >
            <span>Get Started</span>
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
          <Link href="/dashboard/admin" className="transition hover:text-[#F5F3EF]">Admin</Link>
          <Link href="/docs" className="transition hover:text-[#F5F3EF]">Privacy</Link>
          <Link href="/docs" className="transition hover:text-[#F5F3EF]">Terms</Link>
          <span className="text-slate-600">© 2026 AgentID Inc. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
