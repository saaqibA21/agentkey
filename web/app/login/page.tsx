import { redirect } from "next/navigation";

import { auth, devLoginEnabled, oauthProviders, signIn } from "@/auth";
import { Logo } from "@/components/site";
import { inputClass } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  // Only ever return to our own approval screen; anything else falls back to the dashboard.
  const after = next?.startsWith("/connect/authorize?") ? next : "/dashboard";
  if ((await auth())?.user) redirect(after);

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold">Sign in to AIgent</h1>
        <p className="mt-1 text-sm text-muted">New here? Signing in creates your workspace.</p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
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
              <button className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium hover:bg-subtle">
                Continue with {provider.name}
              </button>
            </form>
          ))}

          {devLoginEnabled && (
            <form
              className="space-y-2 rounded-lg border border-dashed border-line p-3"
              action={async (form: FormData) => {
                "use server";
                await signIn("dev", { email: String(form.get("email") ?? ""), redirectTo: after });
              }}
            >
              <p className="text-xs text-muted">Development login (disabled in production builds)</p>
              <input name="email" type="email" required placeholder="you@example.com" className={`w-full ${inputClass}`} />
              <button className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong">
                Continue
              </button>
            </form>
          )}

          {oauthProviders.length === 0 && !devLoginEnabled && (
            <p className="text-sm text-muted">
              No sign-in method is configured. Set AUTH_GOOGLE_ID or AUTH_GITHUB_ID for this deployment.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
