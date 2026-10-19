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
  const avatarSrc = url || `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(fallbackSeed)}`;

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
        className={`flex shrink-0 items-center justify-center rounded-2xl border border-[#8BE8E3]/30 bg-[#080D12] font-mono font-bold text-[#8BE8E3] shadow-inner ${sizeClasses} ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#080D12] p-1 shadow-md shadow-black/40 ring-1 ring-[#8BE8E3]/20 ${sizeClasses} ${className}`}
    >
      <img
        src={avatarSrc}
        alt={`Avatar for ${name}`}
        onError={() => setHasError(true)}
        className="h-full w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}
