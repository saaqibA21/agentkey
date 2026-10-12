import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// Local development convenience. Never active in a production build, whatever the env says.
export const devLoginEnabled =
  process.env.NODE_ENV !== "production" && process.env.AIGENT_DEV_LOGIN === "true";

export const oauthProviders = [
  ...(process.env.AUTH_GOOGLE_ID ? [{ id: "google", name: "Google" }] : []),
  ...(process.env.AUTH_GITHUB_ID ? [{ id: "github", name: "GitHub" }] : []),
];

const providers: Provider[] = [];
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Development login",
      credentials: { email: {} },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  );
}

/** A GitHub profile email may be unverified or absent; only the verified primary address is trusted. */
async function githubVerifiedEmail(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) return null;
  const resp = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const emails = (await resp.json()) as { email: string; primary: boolean; verified: boolean }[];
  return emails.find((e) => e.primary && e.verified)?.email.toLowerCase() ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") return profile?.email_verified === true;
      if (account?.provider === "github") return (await githubVerifiedEmail(account.access_token)) !== null;
      return account?.provider === "dev" && devLoginEnabled;
    },
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        if (account.provider === "github") {
          token.email = (await githubVerifiedEmail(account.access_token)) ?? token.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as { provider?: string }).provider = token.provider as string | undefined;
      return session;
    },
  },
});
