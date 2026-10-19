"use client";

import { useEffect, useState } from "react";
import { AgentAvatar } from "./agent-avatar";

const PRESET_ARCHETYPES = [
  "cyber-vanguard",
  "neural-scout",
  "quantum-core",
  "orbit-beacon",
  "titan-sentinel",
  "pulse-matrix",
];

function randomSeed(prefix = "agent") {
  const clean = prefix.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 15) || "bot";
  const hex = Math.random().toString(16).substring(2, 8);
  return `${clean}-${hex}`;
}

export function AvatarPicker({ defaultName = "New Agent" }: { defaultName?: string }) {
  const [seed, setSeed] = useState(() => randomSeed(defaultName));
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (!isCustom) {
      setSeed(randomSeed(defaultName));
    }
  }, [defaultName, isCustom]);

  const handleRandomize = () => {
    setIsCustom(true);
    setSeed(randomSeed(defaultName));
  };

  const handlePresetSelect = (preset: string) => {
    setIsCustom(true);
    setSeed(`${preset}-${Math.random().toString(16).substring(2, 6)}`);
  };

  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <div className="rounded-2xl border border-line bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Unique Agent Avatar
        </label>
        <span className="text-[11px] text-[#8BE8E3] font-medium">Guaranteed Unique</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <AgentAvatar seed={seed} url={avatarUrl} name={defaultName} size="xl" />

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={seed}
              onChange={(e) => {
                setIsCustom(true);
                setSeed(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="unique-avatar-seed"
              className="flex-1 rounded-xl border border-line bg-black/40 px-3 py-1.5 font-mono text-xs text-[#8BE8E3] focus:border-[#8BE8E3] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-95"
            >
              <svg className="h-3.5 w-3.5 text-[#8BE8E3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Randomize
            </button>
          </div>

          {/* Archetype Quick Selectors */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted uppercase tracking-wider mr-1">Archetypes:</span>
            {PRESET_ARCHETYPES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="rounded-lg border border-line/60 bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#9BA7B4] hover:border-[#8BE8E3]/40 hover:text-white transition"
              >
                {preset.split("-")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden inputs submitted with the ActionForm */}
      <input type="hidden" name="avatar_seed" value={seed} />
      <input type="hidden" name="avatar_url" value={avatarUrl} />
    </div>
  );
}
