import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { createCampaign, listCampaigns, listContacts, listSequences } from "@/lib/server/fns";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Tone } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/campaigns/")({ component: CampaignsPage });

function CampaignsPage() {
  const q = useQuery({ queryKey: ["campaigns"], queryFn: () => listCampaigns() });
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Campaigns</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">Sequences in motion</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New campaign
        </Button>
      </header>
      {!q.data ? (
        <div className="grid gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid gap-3">
          {q.data.map((c) => (
            <Link key={c.id} to="/app/campaigns/$campaignId" params={{ campaignId: c.id }}>
              <Card className="flex flex-col gap-3 transition-shadow hover:shadow-[var(--shadow-border-hover)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl tracking-tight">{c.name}</h2>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{c.description}</p>
                </div>
                <dl className="grid grid-cols-3 gap-6 text-right">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-subtle">Leads</dt>
                    <dd className="font-mono tabular-nums">{c.contactCount}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-subtle">Sent</dt>
                    <dd className="font-mono tabular-nums">{c.sentCount}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-subtle">Review</dt>
                    <dd className="font-mono tabular-nums">{c.reviewCount}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <CreateCampaign open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateCampaign({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const lists = useQuery({ queryKey: ["contacts"], queryFn: () => listContacts() });
  const seqs = useQuery({ queryKey: ["sequences"], queryFn: () => listSequences() });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [tone, setTone] = useState<Tone>("consultative");
  const [approval, setApproval] = useState(true);
  const mut = useMutation({
    mutationFn: () =>
      createCampaign({
        data: {
          name,
          description,
          goal: "meeting",
          listId,
          sequenceId: sequenceId || undefined,
          tone,
          researchDepth: "deep",
          approvalRequired: approval,
        },
      }),
    onSuccess: async (res) => {
      toast.success("Campaign created");
      await qc.invalidateQueries({ queryKey: ["campaigns"] });
      onOpenChange(false);
      void nav({ to: "/app/campaigns/$campaignId", params: { campaignId: res.id } });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>Pick a list. Helix will research and draft after you generate.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!listId) return toast.error("Choose a list");
            mut.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>List</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a list" />
              </SelectTrigger>
              <SelectContent>
                {(lists.data?.lists ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} ({l.contactCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sequence</Label>
            <Select value={sequenceId} onValueChange={setSequenceId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {(seqs.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["consultative", "professional", "friendly", "direct", "formal"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between gap-3 py-2 text-sm">
            Require review
            <Switch checked={approval} onCheckedChange={setApproval} />
          </label>
          <Button type="submit" className="w-full" disabled={mut.isPending}>
            {mut.isPending ? "Creating…" : "Create campaign"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
