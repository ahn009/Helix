import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HelixWordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending } = useCurrentUserState();

  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <HelixWordmark />
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="h-10 w-24 animate-pulse rounded-md bg-elevated" />
          ) : (
            <>
              <SignedOut>
                <Link to="/login" className="text-sm text-muted hover:text-fg">
                  Sign in
                </Link>
                <Button asChild>
                  <Link to="/login">Open workspace</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild>
                  <Link to="/app">
                    Workspace <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </SignedIn>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-16">
        <div className="helix-enter">
          <p className="text-[11px] uppercase tracking-[0.22em] text-subtle">
            Zoho-native outreach
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
            Emails that read like you opened the site.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            Helix researches each company, finds a real tension, and writes a short letter.
            Review it. Send it through Zoho Mail. Follow up without repeating yourself.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/login">Start a workspace</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/app">See the sample desk</Link>
            </Button>
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {[
              ["14.6%", "reply rate"],
              ["Zoho", "Mail & Sheet"],
              ["<150", "words, first touch"],
            ].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-2xl">{k}</dt>
                <dd className="text-xs text-subtle">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <article className="helix-enter helix-enter-delay-2 rounded-xl bg-paper p-6 text-paper-ink shadow-[var(--shadow-lift)] md:p-8">
          <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Draft · Harborline</p>
          <h2 className="mt-3 font-display text-2xl tracking-tight">Harborline's Signals page</h2>
          <div className="email-prose mt-5 text-[15px] leading-relaxed">
            <p>
              Maya — the Signals launch is the first time Harborline has a product a VP of Marketing
              can actually champion, but the page still reads like an engineering changelog.
            </p>
            <p>
              We rebuilt a similar launch page last quarter. Demo requests from marketing buyers went
              from 11% to 27% of total, without touching paid.
            </p>
            <p>Worth a 15-minute teardown of the Signals page this week?</p>
          </div>
          <div className="mt-6 flex gap-4 border-t border-black/10 pt-4 text-xs text-subtle">
            <span>Quality 9.1</span>
            <span>Spam 0.4</span>
            <span>Zoho Mail · queued</span>
          </div>
        </article>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-3">
          {[
            {
              t: "Research, not merge fields",
              d: "Company profile, pain hypotheses, and recent signals — cached so you don't scrape twice.",
            },
            {
              t: "A review desk",
              d: "Quality and spam scores, highlighted personalization, batch-approve anything above a line you set.",
            },
            {
              t: "Zoho as the pipe",
              d: "Mail for sending and warmup. Sheet for live lists. Bookings for the CTA. CRM and Cliq when you want them.",
            },
          ].map((b) => (
            <div key={b.t} className="bg-bg px-8 py-10">
              <h3 className="font-display text-xl tracking-tight">{b.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
