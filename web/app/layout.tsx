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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-white antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
