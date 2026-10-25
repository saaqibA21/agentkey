"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-[#64646A] text-xs transition hover:text-rose-600 font-medium"
    >
      Sign out
    </button>
  );
}
