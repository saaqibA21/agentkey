import { redirect } from "next/navigation";

import { auth, devLoginEnabled, oauthProviders, signIn } from "@/auth";
import { Logo } from "@/components/site";
import { inputClass } from "@/components/ui";

export const metadata = { title: "Sign in · AgentKey" };

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const after = next?.startsWith("/connect/authorize?") ? next : "/dashboard";
  if ((await auth())?.user) redirect(after);

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16 bg-[#FAF5EE] text-[#18191B]">
      <div className="w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-xl border border-[#E5DEC9] bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#18191B] via-[#64646A] to-[#18191B]" />
        <div className="mb-4 flex justify-center select-none">
          <img
            src="/images/agentkey-mascot.png"
            alt="AgentKey Verified Robot Mascot"
            className="w-28 sm:w-32 h-auto drop-shadow-[0_12px_24px_rgba(40,30,20,0.15)]"
          />
        </div>
        <Logo />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#18191B]">Sign in to AgentKey</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[#64646A]">
          Sign in or create your account with Google. New here? Continuing creates your workspace.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 border border-rose-200">
            Sign-in did not complete. Use an account with a verified email address and try again.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {oauthProviders.map((provider) => (
            <form
              key={provider.id}
              action={async () => {
                "use server";
                await signIn(provider.id, { redirectTo: after });
              }}
            >
              <button className={`flex w-full items-center justify-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition ${
                provider.id === "google"
                  ? "bg-[#18191B] text-[#FAF5EE] shadow-md hover:bg-[#2C2D33]"
                  : "border border-[#DDD4C2] bg-white text-[#18191B] hover:border-[#18191B] hover:bg-[#F2ECE1]"
              }`}>
                {provider.id === "google" && <GoogleMark />}
                Continue with {provider.name}
              </button>
            </form>
          ))}

          {devLoginEnabled && (
            <form
              className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 mt-4"
              action={async (form: FormData) => {
                "use server";
                await signIn("dev", { email: String(form.get("email") ?? ""), redirectTo: after });
              }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Instant Operator Login (Dev Mode)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Enter your operator email address</p>
              </div>
              <input
                name="email"
                type="email"
                required
                defaultValue="saaqibheroindia@gmail.com"
                placeholder="you@example.com"
                className={`w-full ${inputClass}`}
              />
              <button className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-slate-200">
                Enter AgentKey Workspace →
              </button>
            </form>
          )}

          {!oauthProviders.some((p) => p.id === "google") && devLoginEnabled && (
            <p className="text-[11px] text-slate-500">
              Google sign-in appears here once AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set.
            </p>
          )}

          {oauthProviders.length === 0 && !devLoginEnabled && (
            <p className="text-sm text-slate-500">
              No sign-in method is configured. Set AUTH_GOOGLE_ID or AUTH_GITHUB_ID for this deployment.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
