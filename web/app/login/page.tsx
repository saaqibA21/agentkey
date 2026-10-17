import { redirect } from "next/navigation";

import { auth, devLoginEnabled, oauthProviders, signIn } from "@/auth";
import { Logo } from "@/components/site";
import { inputClass } from "@/components/ui";

export const metadata = { title: "Sign in · AgentID" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const after = next?.startsWith("/connect/authorize?") ? next : "/dashboard";
  if ((await auth())?.user) redirect(after);

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16 bg-[#07090e] text-white">
      <div className="glass-card w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-500" />
        <Logo />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Sign in to AgentID</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
          Access your verified agent inboxes, session vaults, and guardrails.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-400 border border-rose-500/20">
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
              <button className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/20">
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
                Enter AgentID Workspace →
              </button>
            </form>
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
