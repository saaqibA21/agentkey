"use client";

import { useState } from "react";
import { CopyButton } from "./client";

export type CodeTab = {
  id: string;
  label: string;
  code: string;
  language?: string;
};

export function CodeTabs({ tabs }: { tabs: CodeTab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");

  const active = tabs.find((t) => t.id === activeTab) || tabs[0];
  if (!active) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2E3038] bg-[#1A1B21] shadow-lg">
      <div className="flex flex-wrap items-center justify-between border-b border-[#2E3038] bg-[#15161A] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-1.5 mr-2">
            <span className="h-2 w-2 rounded-full bg-rose-500/60" />
            <span className="h-2 w-2 rounded-full bg-amber-500/60" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  activeTab === tab.id
                    ? "bg-[#2E3038] text-[#8BE8E3] font-semibold"
                    : "text-[#9BA7B4] hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <CopyButton value={active.code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#F2ECE1] selection:bg-white/20">
        {active.code}
      </pre>
    </div>
  );
}
