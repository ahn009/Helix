import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { getDashboard, listCampaigns } from "@/lib/server/fns";
import { Card } from "@/components/ui/card";
import { formatDay } from "@/lib/format";
import { formatPct, formatNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const camps = useQuery({ queryKey: ["campaigns"], queryFn: () => listCampaigns() });
  if (!dash.data) return <Skeleton className="h-80" />;
  const s = dash.data.stats;
  const metrics = [
    ["Sent", formatNumber(s.sent)],
    ["Delivered", formatNumber(s.delivered)],
    ["Opens", formatPct(s.openRate)],
    ["Replies", formatPct(s.replyRate)],
    ["Meetings", formatNumber(s.meetings)],
    ["Bounces", formatPct(s.bounceRate)],
  ];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Analytics</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">What the letters did</h1>
      </header>
      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map(([k, v]) => (
          <Card key={k} className="p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{k}</p>
            <p className="mt-2 font-display text-2xl tabular-nums">{v}</p>
          </Card>
        ))}
      </section>
      <Card>
        <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Volume</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dash.data.daily}>
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
                }}
              />
              <Bar dataKey="sent" fill="#d5cfc3" radius={[4, 4, 0, 0]} />
              <Bar dataKey="opens" fill="#8ea0b0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="replies" fill="#8a9a7b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.12em] text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Sent</th>
              <th className="px-4 py-3 font-medium">Replies</th>
            </tr>
          </thead>
          <tbody>
            {(camps.data ?? []).map((c) => (
              <tr key={c.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    to="/app/campaigns/$campaignId"
                    params={{ campaignId: c.id }}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">{c.contactCount}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{c.sentCount}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{c.replyCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
