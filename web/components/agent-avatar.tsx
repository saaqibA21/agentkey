"use client";

import { useState } from "react";

type AgentAvatarProps = {
  seed?: string | null;
  url?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

export function AgentAvatar({ seed, url, name, size = "md", className = "" }: AgentAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const fallbackSeed = seed || name.toLowerCase().replace(/[^a-z0-9]/g, "-") || "agent";
  
  // Ensure human-like avatar: if the stored URL was an old bottts robot icon, remap to adventurer human style
  let resolvedUrl = url;
  if (resolvedUrl && (resolvedUrl.includes("bottts-neutral") || resolvedUrl.includes("bottts"))) {
    resolvedUrl = resolvedUrl.replace(/bottts-neutral|bottts/g, "adventurer");
  }

  const avatarSrc = resolvedUrl || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(fallbackSeed)}`;

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
  }[size];

  if (hasError) {
    const initials = name.slice(0, 2).toUpperCase() || "AI";
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-[#8BE8E3]/30 bg-[#080D12] font-mono font-bold text-[#8BE8E3] shadow-inner ${sizeClasses} ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-white/15 bg-gradient-to-b from-[#182230] to-[#0A0F14] p-0.5 shadow-lg shadow-black/60 ring-2 ring-[#8BE8E3]/25 ${sizeClasses} ${className}`}
    >
      <img
        src={avatarSrc}
        alt={`Avatar for ${name}`}
        onError={() => setHasError(true)}
        className="h-full w-full rounded-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
