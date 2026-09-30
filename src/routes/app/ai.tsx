import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getBootstrap, updateProfile } from "@/lib/server/fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Tone } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/ai")({ component: VoicePage });

function VoicePage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const p = q.data?.profile;
  const [voice, setVoice] = useState("");
  const [value, setValue] = useState("");
  const [forbidden, setForbidden] = useState("");
  const [tone, setTone] = useState<Tone>("consultative");

  useEffect(() => {
    if (!p) return;
    setVoice(p.brandVoice ?? "");
    setValue(p.valueProp ?? "");
    setForbidden(p.forbiddenWords.join(", "));
    setTone(p.tone);
  }, [p]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        data: {
          brandVoice: voice,
          valueProp: value,
          forbiddenWords: forbidden
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean),
          tone,
        },
      }),
    onSuccess: () => {
      toast.success("Voice saved");
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  if (!p) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Voice</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">How Helix should sound</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          These instructions sit in every generation prompt. Keep them short. Forbidden words are
          stripped from drafts before they reach the review desk.
        </p>
      </header>
      <Card className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
            <SelectTrigger className="max-w-xs">
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
        <div className="space-y-1.5">
          <Label>Brand voice</Label>
          <Textarea className="min-h-28" value={voice} onChange={(e) => setVoice(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Value proposition</Label>
          <Textarea className="min-h-24" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Forbidden words</Label>
          <Textarea value={forbidden} onChange={(e) => setForbidden(e.target.value)} />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save voice
        </Button>
      </Card>
    </div>
  );
}
