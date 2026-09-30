import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listSequences, saveSequence } from "@/lib/server/fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SequenceStep } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/sequences")({ component: SequencesPage });

function SequencesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sequences"], queryFn: () => listSequences() });
  const [name, setName] = useState("New sequence");
  const [steps, setSteps] = useState<SequenceStep[]>([
    { delayDays: 0, label: "First touch", angle: "Specific observation" },
    { delayDays: 3, label: "Proof", angle: "Short case" },
    { delayDays: 10, label: "Break-up", angle: "Permission to close" },
  ]);
  const save = useMutation({
    mutationFn: () => saveSequence({ data: { name, steps } }),
    onSuccess: () => {
      toast.success("Sequence saved");
      void qc.invalidateQueries({ queryKey: ["sequences"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Sequences</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">How follow-ups unfold</h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {(q.data ?? []).map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl tracking-tight">{s.name}</h2>
              {s.isDefault && <span className="text-[11px] uppercase tracking-[0.12em] text-subtle">Default</span>}
            </div>
            <p className="mt-1 text-sm text-muted">{s.description}</p>
            <ol className="mt-4 space-y-2">
              {s.steps.map((st, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-xs text-subtle">+{st.delayDays}d</span>
                  <span>
                    {st.label}
                    <span className="text-muted"> — {st.angle}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
        {!q.data && <Skeleton className="h-40" />}
      </div>
      <Card className="space-y-3">
        <h2 className="font-display text-xl">Compose a sequence</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        {steps.map((st, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[5rem_1fr_1fr]">
            <Input
              type="number"
              value={st.delayDays}
              onChange={(e) => {
                const next = [...steps];
                next[i] = { ...st, delayDays: Number(e.target.value) };
                setSteps(next);
              }}
            />
            <Input
              value={st.label}
              onChange={(e) => {
                const next = [...steps];
                next[i] = { ...st, label: e.target.value };
                setSteps(next);
              }}
            />
            <Input
              value={st.angle}
              onChange={(e) => {
                const next = [...steps];
                next[i] = { ...st, angle: e.target.value };
                setSteps(next);
              }}
            />
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={() => setSteps([...steps, { delayDays: 7, label: "Step", angle: "New value" }])}
        >
          Add step
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save sequence
        </Button>
      </Card>
    </div>
  );
}
