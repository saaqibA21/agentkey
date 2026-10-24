"use client";

import { useEffect, useState } from "react";
import { AgentAvatar } from "./agent-avatar";

const PRESET_ARCHETYPES = [
  { seed: "alex-product", label: "Alex (Product)" },
  { seed: "maya-research", label: "Maya (Research)" },
  { seed: "jordan-devops", label: "Jordan (DevOps)" },
  { seed: "priya-exec", label: "Priya (Executive)" },
  { seed: "marcus-data", label: "Marcus (Data)" },
  { seed: "elena-creative", label: "Elena (Design)" },
];

const HUMAN_STYLES = [
  { id: "adventurer", label: "Illustrated" },
  { id: "personas", label: "Modern Minimal" },
  { id: "avataaars", label: "Classic Human" },
  { id: "lorelei", label: "Editorial" },
];

function deterministicSeed(prefix = "agent") {
  const clean = prefix.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 15) || "persona";
  return `${clean}-avatar`;
}

function randomSeed(prefix = "agent") {
  const clean = prefix.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 15) || "persona";
  const hex = Math.random().toString(16).substring(2, 8);
  return `${clean}-${hex}`;
}

export function AvatarPicker({ defaultName = "New Agent" }: { defaultName?: string }) {
  const [seed, setSeed] = useState(() => deterministicSeed(defaultName));
  const [style, setStyle] = useState("adventurer");
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    // Randomize uniquely on client-side mount without causing SSR hydration mismatch
    if (!isCustom) {
      setSeed(randomSeed(defaultName));
    }
  }, [defaultName]);

  const handleRandomize = () => {
    setIsCustom(true);
    setSeed(randomSeed(defaultName));
  };

  const handlePresetSelect = (presetSeed: string) => {
    setIsCustom(true);
    setSeed(`${presetSeed}-${Math.random().toString(16).substring(2, 6)}`);
  };

  const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <div className="rounded-2xl border border-line bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Unique Human Persona Avatar
        </label>
        <span className="text-[11px] text-sky-400 font-medium">Guaranteed Unique</span>
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
              placeholder="unique-human-seed"
              className="flex-1 rounded-xl border border-line bg-black/40 px-3 py-1.5 font-mono text-xs text-sky-400 focus:border-sky-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-95"
            >
              <svg className="h-3.5 w-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Randomize
            </button>
          </div>

          {/* Style Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted uppercase tracking-wider mr-1">Style:</span>
            {HUMAN_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`rounded-lg border px-2 py-0.5 text-[10px] transition ${
                  style === s.id
                    ? "border-sky-500/60 bg-sky-500/15 text-sky-400 font-semibold"
                    : "border-line/60 bg-white/[0.03] text-[#9BA7B4] hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Persona Quick Selectors */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted uppercase tracking-wider mr-1">Personas:</span>
            {PRESET_ARCHETYPES.map((p) => (
              <button
                key={p.seed}
                type="button"
                onClick={() => handlePresetSelect(p.seed)}
                className="rounded-lg border border-line/60 bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#9BA7B4] hover:border-sky-500/40 hover:text-white transition"
              >
                {p.label.split(" ")[0]}
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
