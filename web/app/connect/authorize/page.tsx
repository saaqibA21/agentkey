import { redirect } from "next/navigation";
import crypto from "crypto";
import { auth } from "@/auth";
import { Logo } from "@/components/site";
import { Badge } from "@/components/ui";
import { getOAuthClientById, storeAuthCode } from "@/lib/oauth-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in with AgentKey" };

async function submitConsent(formData: FormData) {
  "use server";

  // Enforce server-side authenticated session to prevent user_email impersonation
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const verdict = formData.get("verdict");
  const redirectUri = String(formData.get("redirect_uri") || "");
  const state = String(formData.get("state") || "");
  const clientId = String(formData.get("client_id") || "cli_claude_desktop");
  const codeChallenge = String(formData.get("code_challenge") || "");

  const userEmail = session.user.email;
  const userName = session.user.name || userEmail.split("@")[0];

  if (!redirectUri) {
    redirect("/dashboard");
  }

  // Prevent Open Redirect: Verify redirectUri belongs to registered client
  const client = getOAuthClientById(clientId);
  if (!client) {
    redirect("/dashboard?error=invalid_client");
  }

  const isAllowedUri = client.redirect_uris.some((registered) => {
    try {
      const regUrl = new URL(registered);
      const reqUrl = new URL(redirectUri);
      return regUrl.origin === reqUrl.origin && regUrl.pathname === reqUrl.pathname;
    } catch {
      return false;
    }
  });

  if (!isAllowedUri) {
    redirect("/dashboard?error=unauthorized_redirect_uri");
  }

  const redirectUrl = new URL(redirectUri);

  if (verdict === "deny") {
    redirectUrl.searchParams.set("error", "access_denied");
    redirectUrl.searchParams.set("error_description", "The user denied access to the application.");
    if (state) redirectUrl.searchParams.set("state", state);
    redirect(redirectUrl.toString());
  }

  // Generate OAuth 2.1 authorization code
  const code = `code_${crypto.randomBytes(24).toString("hex")}`;
  storeAuthCode({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge || undefined,
    scopes: ["openid", "profile", "email", "read", "send"],
    user_email: userEmail,
    user_name: userName,
    expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes TTL
  });

  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  redirect(redirectUrl.toString());
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{
    client_id?: string;
    redirect_uri?: string;
    response_type?: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    request?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();

  // If user is not signed in, redirect to login then return here
  if (!session?.user) {
    const fullQuery = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) fullQuery.set(k, v);
    });
    redirect(`/login?next=${encodeURIComponent(`/connect/authorize?${fullQuery.toString()}`)}`);
  }

  const clientId = params.client_id || "cli_claude_desktop";
  const client = getOAuthClientById(clientId) || {
    client_id: clientId,
    client_name: clientId.replace(/^cli_/i, "").replace(/_/g, " "),
    redirect_uris: params.redirect_uri ? [params.redirect_uri] : ["https://claude.ai/api/auth/callback"],
    created_at: new Date().toISOString(),
  };

  const redirectUri = params.redirect_uri || client.redirect_uris[0] || "http://localhost:3000/callback";
  const state = params.state || "";
  const codeChallenge = params.code_challenge || "";

  let redirectHost = "";
  try {
    redirectHost = new URL(redirectUri).host;
  } catch {
    redirectHost = "External Application";
  }

  const user = session.user;
  const userName = user.name || "Operator";
  const userEmail = user.email || "saaqibheroindia@gmail.com";
  const userImage = user.image;

  return (
    <main className="grid min-h-screen place-items-center bg-[#0C0F12] px-4 py-8 text-white font-sans">
      <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#14181D] p-7 shadow-2xl backdrop-blur-xl">
        {/* Top Header - Similar to Google Auth */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Logo />
          </div>
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            OAuth 2.1 & OIDC
          </span>
        </div>

        {/* Title */}
        <div className="mt-5 text-center">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Sign in with AgentKey
          </h1>
          <p className="mt-1 text-xs text-white/60">
            to continue to <span className="font-semibold text-white">{client.client_name}</span>
          </p>
        </div>

        {/* Google-Style Account Selector Box */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="h-10 w-10 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 font-bold text-white text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-white">{userName}</span>
              <Badge tone="good">Verified</Badge>
            </div>
            <p className="truncate text-xs text-white/50">{userEmail}</p>
          </div>
        </div>

        {/* Permissions & Scopes Card */}
        <div className="mt-5 space-y-3">
          <p className="text-xs font-medium text-white/70">
            <b className="text-white">{client.client_name}</b> will be granted access to:
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/5 text-sky-400">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-white">Agent Inboxes &amp; Edge OTPs</p>
                <p className="text-white/50">Read incoming verification codes from agent-01@agentkey.in without token waste.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/5 text-sky-400">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-white">Send Outbound Messages</p>
                <p className="text-white/50">Deliver emails with Owner-Delegated legal binding signed by {userName}.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/5 text-sky-400">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-white">99.0 Trust Passport Attestation</p>
                <p className="text-white/50">Verify agent identity without CAPTCHAs across enterprise platforms.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="mt-4 text-[11px] leading-relaxed text-white/40 text-center">
          You will be redirected back to <b className="text-white/80">{redirectHost}</b>. You can revoke access at any time in your AgentKey Dashboard.
        </p>

        {/* Action Buttons - Similar to Google Auth */}
        <form action={submitConsent} className="mt-5 space-y-2.5">
          <input type="hidden" name="client_id" value={client.client_id} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />

          <button
            type="submit"
            name="verdict"
            value="approve"
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2.5 text-center text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 hover:opacity-95 transition active:scale-[0.99]"
          >
            Continue as {userName.split(" ")[0]}
          </button>

          <button
            type="submit"
            name="verdict"
            value="deny"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-center text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            Cancel
          </button>
        </form>
      </div>
    </main>
  );
}
