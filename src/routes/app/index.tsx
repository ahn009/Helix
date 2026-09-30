import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { getDashboard } from "@/lib/server/fns";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPct, formatNumber, fullName } from "@/lib/utils";
import { formatDay } from "@/lib/format";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  if (q.isLoading || !q.data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  const { stats, daily, campaigns, replies, reviewQueue } = q.data;
  const tiles = [
    { k: "Reply rate", v: formatPct(stats.replyRate) },
    { k: "Open rate", v: formatPct(stats.openRate) },
    { k: "Meetings", v: formatNumber(stats.meetings) },
    { k: "In review", v: formatNumber(stats.inReview) },
  ];

  return (
    <div className="space-y-8">
      <header className="helix-enter">
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Desk</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">Today at Northwind</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {stats.runningCampaigns} campaigns running · {formatNumber(stats.sent)} sent through Zoho
          Mail · {formatNumber(stats.activeContacts)} active leads
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <Card key={t.k} className={`helix-enter helix-enter-delay-${i + 1}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">{t.k}</p>
            <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">{t.v}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Last 14 days</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d5cfc3" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d5cfc3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDay(d)}
                  stroke="#6f6a62"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1c1b18",
                    border: "1px solid rgba(241,238,230,0.12)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(d) => formatDay(String(d))}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#d5cfc3"
                  fill="url(#sent)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="replies"
                  stroke="#8a9a7b"
                  fill="transparent"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Inbox</p>
            <Link to="/app/inbox" className="text-xs text-muted hover:text-fg">
              All replies
            </Link>
          </div>
          <ul className="space-y-3">
            {replies.map((r) => (
              <li key={r.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.contactName}</p>
                  <StatusBadge status={r.category} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Campaigns</p>
            <Link to="/app/campaigns" className="text-xs text-muted hover:text-fg">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  to="/app/campaigns/$campaignId"
                  params={{ campaignId: c.id }}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-elevated"
                >
                  <div>
                    <p className="text-sm">{c.name}</p>
                    <p className="text-xs text-subtle">
                      {c.sentCount} sent · {c.reviewCount} in review
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Needs a human</p>
            <Link to="/app/campaigns" className="text-xs text-muted hover:text-fg">
              Review desk
            </Link>
          </div>
          <ul className="space-y-3">
            {reviewQueue.map((d) => (
              <li key={d.id}>
                <Link
                  to="/app/campaigns/$campaignId"
                  params={{ campaignId: d.campaignId }}
                  className="flex items-start justify-between gap-3 rounded-md px-1 py-1 hover:bg-elevated"
                >
                  <div>
                    <p className="text-sm">
                      {fullName(d.contact.firstName, d.contact.lastName)}
                      <span className="text-muted"> · {d.contact.companyName}</span>
                    </p>
                    <p className="text-xs text-subtle">{d.subject}</p>
                  </div>
                  <p className="font-mono text-xs tabular-nums text-sage">{d.qualityScore.toFixed(1)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
