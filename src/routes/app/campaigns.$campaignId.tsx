import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Pause,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveByScore,
  approveDraft,
  generateFollowUp,
  generateForCampaign,
  getCampaign,
  regenerateDraft,
  rejectDraft,
  sendAllApproved,
  sendApproved,
  setCampaignStatus,
  updateDraft,
} from "@/lib/server/fns";
import { ScoreRing } from "@/components/score-ring";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { wordCount } from "@/lib/email-quality";
import type { DraftRow, Sequence } from "@/lib/types";
import { cn, fullName } from "@/lib/utils";

export const Route = createFileRoute("/app/campaigns/$campaignId")({
  component: CampaignDesk,
});

type Filter = "review" | "approved" | "sent" | "all";

function CampaignDesk() {
  const { campaignId } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => getCampaign({ data: campaignId }),
  });
  const [filter, setFilter] = useState<Filter>("review");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const drafts = q.data?.drafts ?? [];
  const filtered = useMemo(() => {
    const byQuality = (a: DraftRow, b: DraftRow) => b.qualityScore - a.qualityScore;
    if (filter === "review")
      return drafts.filter((d) => d.status === "generated" || d.status === "edited").sort(byQuality);
    if (filter === "approved") return drafts.filter((d) => d.status === "approved");
    if (filter === "sent") return drafts.filter((d) => d.status === "sent");
    return drafts;
  }, [drafts, filter]);

  useEffect(() => {
    if (selectedId && filtered.some((d) => d.id === selectedId)) return;
    const prefer = filtered[0] ?? drafts[0];
    setSelectedId(prefer?.id ?? null);
  }, [filtered, drafts, selectedId]);

  const current = drafts.find((d) => d.id === selectedId) ?? filtered[0] ?? null;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
    await qc.invalidateQueries({ queryKey: ["campaigns"] });
    await qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const generate = useMutation({
    mutationFn: () => generateForCampaign({ data: { campaignId, limit: 4 } }),
    onSuccess: (r) => {
      toast.success(r.generated ? `Drafted ${r.generated} letter${r.generated === 1 ? "" : "s"}` : "Nothing pending");
      void invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const batch = useMutation({
    mutationFn: () =>
      approveByScore({
        data: { campaignId, minScore: q.data?.campaign.autoApproveThreshold ?? 8.5 },
      }),
    onSuccess: (r) => {
      toast.success(`Approved ${r.count}`);
      void invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const sendAll = useMutation({
    mutationFn: () => sendAllApproved({ data: { campaignId } }),
    onSuccess: (r) => {
      if (r.sent === 0) toast.error("Nothing to send — approve a draft first, and connect Zoho Mail");
      else toast.success(`Queued ${r.sent} through Zoho Mail`);
      void invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const pause = useMutation({
    mutationFn: (status: string) => setCampaignStatus({ data: { id: campaignId, status } }),
    onSuccess: () => void invalidate(),
  });

  if (!q.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  }

  const { campaign, pending, approvedCount, sequence } = q.data;
  const reviewCount = drafts.filter((d) => d.status === "generated" || d.status === "edited").length;
  const threshold = campaign.autoApproveThreshold ?? 8.5;
  const paused = campaign.status === "paused";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/app/campaigns"
            className="inline-flex items-center gap-1 text-xs text-subtle hover:text-fg"
          >
            <ArrowLeft className="size-3.5" /> Campaigns
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl tracking-tight md:text-4xl">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted">{campaign.description}</p>
          <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
            {campaign.contactCount} leads · {campaign.sentCount} sent · {reviewCount} in review ·{" "}
            {approvedCount} approved · via Zoho Mail
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && campaign.status !== "completed" && (
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles className="size-4" />
              {generate.isPending ? "Writing…" : `Generate ${Math.min(pending.length, 4)}`}
            </Button>
          )}
          {reviewCount > 0 && (
            <Button variant="secondary" onClick={() => batch.mutate()} disabled={batch.isPending}>
              Approve ≥ {threshold.toFixed(1)}
            </Button>
          )}
          {approvedCount > 0 && (
            <Button variant="secondary" onClick={() => sendAll.mutate()} disabled={sendAll.isPending}>
              <Send className="size-4" /> Send approved
            </Button>
          )}
          {(campaign.status === "running" || paused) && (
            <Button
              variant="ghost"
              onClick={() => pause.mutate(paused ? "running" : "paused")}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ["review", `Review (${reviewCount})`],
            ["approved", `Approved (${approvedCount})`],
            ["sent", `Sent (${campaign.sentCount})`],
            ["all", `All (${drafts.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "h-9 rounded-md px-3 text-xs transition-colors",
              filter === k ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[16.5rem_minmax(0,1fr)_17rem]">
        <Card className="p-2">
          <ScrollArea className="h-[min(70vh,40rem)]">
            <ul className="space-y-0.5 p-1">
              {filtered.map((d) => {
                const name = fullName(d.contact.firstName, d.contact.lastName);
                const active = current?.id === d.id;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        "w-full rounded-md px-3 py-2.5 text-left transition-colors",
                        active ? "bg-elevated" : "hover:bg-elevated/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{name}</span>
                        <span
                          className={cn(
                            "font-mono text-[11px] tabular-nums",
                            d.qualityScore >= 8.5 ? "text-sage" : "text-subtle",
                          )}
                        >
                          {d.qualityScore.toFixed(1)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-subtle">{d.contact.companyName}</p>
                    </button>
                  </li>
                );
              })}
              {pending.length > 0 && filter !== "sent" && filter !== "approved" && (
                <li className="px-3 pt-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">Not drafted</p>
                  <ul className="mt-2 space-y-1">
                    {pending.map((p) => (
                      <li key={p.id} className="text-xs text-muted">
                        {fullName(p.firstName, p.lastName)}
                        <span className="text-subtle"> · {p.companyName}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              {filtered.length === 0 && pending.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-muted">Nothing in this tray.</li>
              )}
            </ul>
          </ScrollArea>
        </Card>

        {current ? (
          <DraftPane
            key={current.id}
            draft={current}
            sequence={sequence}
            onChanged={invalidate}
          />
        ) : (
          <Card className="grid min-h-80 place-items-center text-sm text-muted">
            {pending.length > 0 ? "Generate letters to fill the review desk." : "No drafts in this campaign."}
          </Card>
        )}

        {current && (
          <ResearchPane draft={current} className="hidden xl:flex" />
        )}
      </div>
      {current && <ResearchPane draft={current} className="xl:hidden" />}
    </div>
  );
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .trim();
}

function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, " ").trim()}</p>`)
    .join("");
}

function DraftPane({
  draft,
  sequence,
  onChanged,
}: {
  draft: DraftRow;
  sequence: Sequence | null;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(htmlToText(draft.bodyHtml));
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const save = useMutation({
    mutationFn: () =>
      updateDraft({ data: { id: draft.id, subject, bodyHtml: textToHtml(body) } }),
    onSuccess: async () => {
      toast.success("Edits saved");
      setEditing(false);
      await onChanged();
    },
    onError: (e) => toast.error(e.message),
  });
  const approve = useMutation({
    mutationFn: (send: boolean) => approveDraft({ data: { id: draft.id, send } }),
    onSuccess: async (r) => {
      if ("sent" in r && r.sent) toast.success("Approved and queued on Zoho Mail");
      else if ("ok" in r && r.ok === false) toast.error(r.error);
      else toast.success("Approved");
      await onChanged();
    },
    onError: (e) => toast.error(e.message),
  });
  const send = useMutation({
    mutationFn: async () => {
      if (draft.status === "approved") return sendApproved({ data: { draftId: draft.id } });
      return approveDraft({ data: { id: draft.id, send: true } });
    },
    onSuccess: async (r) => {
      if ("ok" in r && r.ok === false) toast.error(r.error);
      else toast.success("Queued through Zoho Mail");
      await onChanged();
    },
    onError: (e) => toast.error(e.message),
  });
  const regen = useMutation({
    mutationFn: () => regenerateDraft({ data: draft.id }),
    onSuccess: async () => {
      toast.success("Rewritten");
      await onChanged();
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: () => rejectDraft({ data: { id: draft.id, reason } }),
    onSuccess: async () => {
      toast.success("Rejected");
      setRejectOpen(false);
      await onChanged();
    },
  });
  const follow = useMutation({
    mutationFn: () => {
      const next = sequence?.steps[draft.step + 1];
      return generateFollowUp({
        data: {
          campaignContactId: draft.campaignContactId,
          angle: next?.angle ?? "Short proof, new angle, one ask",
        },
      });
    },
    onSuccess: async () => {
      toast.success("Follow-up drafted");
      await onChanged();
    },
    onError: (e) => toast.error(e.message),
  });

  const reviewable = draft.status === "generated" || draft.status === "edited";
  const words = wordCount(editing ? textToHtml(body) : draft.bodyHtml);

  return (
    <div className="space-y-3">
      <article className="rounded-xl bg-paper p-5 text-paper-ink shadow-[var(--shadow-lift)] md:p-7">
        <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">
          {fullName(draft.contact.firstName, draft.contact.lastName)} · {draft.contact.companyName}
        </p>
        {editing ? (
          <div className="mt-3 space-y-3">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-0 bg-paper-ink/5 text-paper-ink shadow-none"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-56 border-0 bg-paper-ink/5 text-[15px] leading-relaxed text-paper-ink shadow-none"
            />
          </div>
        ) : (
          <>
            <h2 className="mt-3 font-display text-2xl tracking-tight">{draft.subject}</h2>
            <div
              className="email-prose mt-5 text-[15px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: draft.bodyHtml }}
            />
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-4 border-t border-black/10 pt-4 text-xs text-subtle">
          <span>Quality {draft.qualityScore.toFixed(1)}</span>
          <span>Spam {draft.spamScore.toFixed(1)}</span>
          <span>{words} words</span>
          <span>Step {draft.step + 1}</span>
        </div>
      </article>

      {draft.personalization.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.personalization.map((p) => (
            <span key={p} className="rounded-full bg-elevated px-2.5 py-1 text-[11px] text-muted">
              {p}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save edits
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            {reviewable && (
              <Button onClick={() => approve.mutate(false)} disabled={approve.isPending}>
                <Check className="size-4" /> Approve
              </Button>
            )}
            {(reviewable || draft.status === "approved") && (
              <Button variant="secondary" onClick={() => send.mutate()} disabled={send.isPending}>
                <Send className="size-4" /> {send.isPending ? "Sending…" : "Approve & send"}
              </Button>
            )}
            {reviewable && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {reviewable && (
              <Button variant="ghost" onClick={() => regen.mutate()} disabled={regen.isPending}>
                <RefreshCw className={cn("size-4", regen.isPending && "animate-spin")} />
                Rewrite
              </Button>
            )}
            {reviewable && (
              <Button variant="ghost" onClick={() => setRejectOpen(true)}>
                <X className="size-4" /> Reject
              </Button>
            )}
            {draft.status === "sent" && (
              <Button variant="secondary" onClick={() => follow.mutate()} disabled={follow.isPending}>
                Write follow-up
              </Button>
            )}
          </>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this letter</DialogTitle>
            <DialogDescription>Helix keeps the reason next to the draft.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Too generic / wrong pain / wrong ask"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button onClick={() => reject.mutate()} disabled={reject.isPending}>
            Reject
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResearchPane({ draft, className }: { draft: DraftRow; className?: string }) {
  const co = draft.company;
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <div className="flex justify-around">
        <ScoreRing value={draft.qualityScore} label="Quality" />
        <ScoreRing value={draft.spamScore} label="Spam" invert />
        <ScoreRing value={draft.grammarScore} label="Grammar" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Prospect</p>
        <p className="mt-1 text-sm">{fullName(draft.contact.firstName, draft.contact.lastName)}</p>
        <p className="text-xs text-muted">
          {draft.contact.jobTitle}
          {draft.contact.location ? ` · ${draft.contact.location}` : ""}
        </p>
        <p className="mt-1 text-xs text-subtle">{draft.contact.email}</p>
      </div>
      {co?.description && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Research</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{co.description}</p>
        </div>
      )}
      {co?.recentSignals && co.recentSignals.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Signals</p>
          <ul className="mt-1 space-y-1 text-sm text-muted">
            {co.recentSignals.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </div>
      )}
      {co?.painPoints && co.painPoints.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Pain hypotheses</p>
          <ul className="mt-2 space-y-3">
            {co.painPoints.map((p) => (
              <li key={p.hypothesis}>
                <p className="text-sm">{p.hypothesis}</p>
                <p className="mt-0.5 text-xs text-subtle">{p.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
