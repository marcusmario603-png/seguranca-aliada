import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProcesses } from "@/hooks/use-crm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ALL_STATUSES,
  CLOSED_STAGES,
  PIPELINE_STAGES,
  STATUS_LABEL,
  clientName,
  friendlyError,
  type ProcessStatus,
} from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline | CRM Garantia e Proteção" },
      { name: "description", content: "Acompanhe os processos de plano de saúde por etapa comercial." },
      { property: "og:title", content: "Pipeline | CRM Garantia e Proteção" },
      { property: "og:description", content: "Acompanhe os processos de plano de saúde por etapa comercial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PipelinePage,
});

export function useMoveProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ProcessStatus; reason?: string }) => {
      const payload: Record<string, unknown> = { status: input.status };
      if (input.status === "cancelled") payload.cancellation_reason = input.reason;
      const { error } = await supabase.from("processes").update(payload as never).eq("id", input.id);
      if (error) throw error;
      return input.status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      queryClient.invalidateQueries({ queryKey: ["process"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success(`Processo atualizado para ${STATUS_LABEL[status]}.`);
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível mover o processo.")),
  });
}

function PipelinePage() {
  const { data: processes = [] } = useProcesses();
  const move = useMoveProcess();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const columns = [...PIPELINE_STAGES, ...CLOSED_STAGES];

  function handleChange(id: string, status: ProcessStatus) {
    if (status === "cancelled") {
      setCancelTarget(id);
      setReason("");
      return;
    }
    move.mutate({ id, status });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline comercial</h1>
        <p className="text-sm text-muted-foreground">Arraste o processo entre etapas alterando a situação no card.</p>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 pb-3">
        <div className="flex min-w-max gap-4">
          {columns.map((stage) => {
            const items = processes.filter((p) => p.status === stage);
            return (
              <section key={stage} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between rounded-lg bg-card px-3 py-2 shadow-sm">
                  <span className="text-sm font-semibold">{STATUS_LABEL[stage]}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((p) => (
                    <article key={p.id} className="rounded-xl border bg-card p-3 shadow-sm">
                      <Link
                        to="/processos/$id"
                        params={{ id: p.id }}
                        className="line-clamp-2 text-sm font-medium hover:underline"
                      >
                        {clientName(p.clients)}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.plan_type} · {p.operators?.name || "Sem operadora"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.lives_quantity} vida(s) ·{" "}
                        {p.profiles?.name || "Sem responsável"}
                      </p>
                      <Select value={p.status} onValueChange={(v) => handleChange(p.id, v as ProcessStatus)}>
                        <SelectTrigger className="mt-2 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </article>
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Nenhum processo
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar processo</DialogTitle>
            <DialogDescription>Informe o motivo do cancelamento.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) { toast.error("Informe o motivo do cancelamento."); return; }
                move.mutate({ id: cancelTarget!, status: "cancelled", reason });
                setCancelTarget(null);
              }}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
