import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent font-mono text-sm text-white">@</span>
      <span>
        AI<span className="text-accent">gent</span>
      </span>
    </Link>
  );
}

export function SiteNav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Logo />
      <nav className="flex items-center gap-5 text-sm">
        <Link href="/docs" className="text-muted hover:text-ink">Docs</Link>
        <Link href="/dashboard" className="rounded-lg bg-accent px-3.5 py-2 font-medium text-white hover:bg-accent-strong">
          Get an API key
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-8 text-sm text-muted">
      <span>AIgent. Free during beta.</span>
      <span className="flex gap-5">
        <Link href="/docs" className="hover:text-ink">Docs</Link>
        <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
      </span>
    </footer>
  );
}
