import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, rememberLocalNetworkSession, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { HelixWordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "@/lib/demo-admin";
import { getAuthMethods } from "@/lib/server/auth-methods";

export const Route = createFileRoute("/login")({
  loader: () => getAuthMethods(),
  component: Login,
});

function Login() {
  const { oauthConfigured } = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <div className="min-h-screen bg-bg" />;
  }
  if (user) return <Navigate to="/app" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "Operator",
          callbackURL: "/app",
        });
        if (res.error) throw new Error(res.error.message || "Could not create account");
        rememberLocalNetworkSession(res.data?.token);
      } else {
        const res = await authClient.signIn.email({ email, password, callbackURL: "/app" });
        if (res.error) throw new Error(res.error.message || "Could not sign in");
        rememberLocalNetworkSession(res.data?.token);
      }
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden flex-col justify-between border-r border-border bg-surface p-10 lg:flex">
        <HelixWordmark />
        <div className="max-w-md">
          <p className="font-display text-4xl leading-tight tracking-tight">
            Research on the left.
            <br />
            The letter on the right.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Helix writes like a senior SDR who actually opened the site. Sending happens through
            Zoho Mail, lists arrive from Zoho Sheet — no Google in the loop.
          </p>
        </div>
        <p className="text-xs text-subtle">Northwind Digital · sample workspace</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <HelixWordmark />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">
              {mode === "in" ? "Sign in" : "Create an account"}
            </h1>
            <p className="mt-1 text-sm text-muted">Your workspace stays on this account.</p>
          </div>
          {authEnabled ? (
            <>
              {oauthConfigured && (
                <>
                  <div className="grid gap-2">
                    {GROK_PROVIDERS.map((p) => (
                      <Button
                        key={p.providerId}
                        type="button"
                        variant="secondary"
                        onClick={() => signIn(p.providerId, { callbackURL: "/app" })}
                      >
                        Continue with {p.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-subtle">
                    <span className="h-px flex-1 bg-border" />
                    or email
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}
              <form onSubmit={onSubmit} className="space-y-3">
                {mode === "up" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                {error && <p className="text-sm text-rust">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
                </Button>
              </form>
              {import.meta.env.DEV && mode === "in" && (
                <div className="rounded-lg border border-border bg-surface p-4 text-sm">
                  <p className="font-medium text-fg">Preview admin account</p>
                  <p className="mt-1 text-muted">Use these credentials to explore the sample workspace.</p>
                  <p className="mt-3 font-mono text-fg">{DEMO_ADMIN_EMAIL}</p>
                  <p className="font-mono text-fg">{DEMO_ADMIN_PASSWORD}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => {
                      setEmail(DEMO_ADMIN_EMAIL);
                      setPassword(DEMO_ADMIN_PASSWORD);
                      setError(null);
                    }}
                  >
                    Fill credentials
                  </Button>
                </div>
              )}
              <button
                type="button"
                className="text-sm text-muted hover:text-fg"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
              >
                {mode === "in" ? "Need an account? Create one" : "Have an account? Sign in"}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
          <Link to="/" className="block text-sm text-subtle hover:text-fg">
            Back to Helix
          </Link>
        </div>
      </section>
    </main>
  );
}
