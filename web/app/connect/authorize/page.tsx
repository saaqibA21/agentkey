import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ActionForm } from "@/components/client";
import { Logo } from "@/components/site";
import { api, ApiError } from "@/lib/api";

import { decideConsent } from "../../dashboard/actions";

export const metadata = { title: "Allow access" };

const permissions = [
  ["read", "Read your agent inboxes", "See messages, codes and links that arrive.", true],
  ["manage", "Create inboxes", "Make new addresses and manage rules and webhooks.", true],
  ["send", "Send messages", "Send email, WhatsApp and SMS from your inboxes.", false],
  ["connect", "Act as you on other services", "Use your connected accounts and saved logins, within the limits you set on the Identity page.", false],
] as const;

type Consent = { client_name: string; redirect_host: string; requested_scopes: string[]; workspace: string };

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const { request = "" } = await searchParams;
  const here = `/connect/authorize?request=${encodeURIComponent(request)}`;
  if (!(await auth())?.user) redirect(`/login?next=${encodeURIComponent(here)}`);

  let consent: Consent | null = null;
  try {
    consent = await api<Consent>("/oauth/consent", { method: "POST", body: JSON.stringify({ request }) });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
        <Logo />
        {!consent ? (
          <>
            <h1 className="mt-6 text-xl font-semibold">This link has expired</h1>
            <p className="mt-2 text-sm text-muted">Go back to the app and start connecting again.</p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold">Allow {consent.client_name} to use AIgent?</h1>
            <p className="mt-2 text-sm text-muted">
              You will be sent back to <b className="text-ink">{consent.redirect_host}</b>. Only continue if that is
              the app you are setting up. Workspace: {consent.workspace}.
            </p>
            <ActionForm action={decideConsent} submit="Allow" className="mt-5 space-y-3">
              <input type="hidden" name="request" value={request} />
              <input type="hidden" name="verdict" value="approve" />
              {permissions.map(([id, label, help, checked]) => (
                <label key={id} className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
                  <input type="checkbox" name={`scope_${id}`} className="mt-1 accent-[var(--accent)]"
                         defaultChecked={checked || consent.requested_scopes.length === 1 && consent.requested_scopes[0] === id} />
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="block text-xs text-muted">{help}</span>
                  </span>
                </label>
              ))}
            </ActionForm>
            <ActionForm action={decideConsent} submit="Cancel" variant="secondary" className="mt-2">
              <input type="hidden" name="request" value={request} />
              <input type="hidden" name="verdict" value="deny" />
            </ActionForm>
            <p className="mt-4 text-xs text-muted">You can remove this app at any time under Identity in your dashboard.</p>
          </>
        )}
      </div>
    </main>
  );
}
