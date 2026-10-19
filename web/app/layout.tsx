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
      <body className="min-h-screen bg-[#080D12] text-[#F5F3EF] antialiased selection:bg-[#8BE8E3]/20 selection:text-[#8BE8E3]">
        {children}
      </body>
    </html>
  );
}
