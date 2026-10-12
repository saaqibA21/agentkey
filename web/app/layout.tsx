import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AIgent: an inbox for every AI agent", template: "%s · AIgent" },
  description:
    "Give your AI agent its own email address in one API call. OTPs and magic links arrive already parsed. Works with Claude, Cursor, LangChain and any MCP client.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
