import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BAGENTS · Identity for AI Agents", template: "%s · BAGENTS" },
  description:
    "BAGENTS provides secure, verifiable and portable identities for AI agents — so they can act, access, and collaborate across the internet, just like humans.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F6F4] text-[#0E171B] antialiased selection:bg-emerald-500/20 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
