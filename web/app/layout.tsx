import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AgentKey · Sign-In & Identity OS for AI Agents", template: "%s · AgentKey" },
  description:
    "AgentKey gives your AI agent its own email, credentials, and verifiable OAuth passport to sign in independently across the internet.",
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
