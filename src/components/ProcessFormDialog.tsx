import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients, useOperators, useProfiles } from "@/hooks/use-crm";
import {
  ACCOMMODATIONS,
  ALL_STATUSES,
  COVERAGES,
  NETWORK_TYPES,
  PLAN_TYPES,
  SEGMENTS,
  STATUS_LABEL,
  clientName,
  friendlyError,
  type ProcessStatus,
} from "@/lib/crm";

type ProcessRow = Record<string, unknown> & { id?: string };

const empty = {
  client_id: "",
  responsible_user_id: "",
  operator_id: "",
  plan_type: "Individual",
  status: "lead" as ProcessStatus,
  coverage: "Nacional",
  accommodation: "Enfermaria",
  network_type: "Credenciada",
  assistance_segment: "Ambulatorial + Hospitalar",
  coparticipation: false,
  reimbursement: false,
  lives_quantity: 1,
  cancellation_reason: "",
  notes: "",
};

export function ProcessFormDialog({
  open,
  onOpenChange,
  process,
  clientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  process?: ProcessRow | null;
  clientId?: string;
  onSaved?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClients();
  const { data: operators = [] } = useOperators();
  const { data: profiles = [] } = useProfiles();
  const [values, setValues] = useState({ ...empty });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      setValues({
        ...empty,
        ...(process
          ? {
              client_id: String(process.client_id || ""),
              responsible_user_id: String(process.responsible_user_id || ""),
              operator_id: String(process.operator_id || ""),
              plan_type: String(process.plan_type || "Individual"),
              status: process.status as ProcessStatus,
              coverage: String(process.coverage || "Nacional"),
              accommodation: String(process.accommodation || "Enfermaria"),
              network_type: String(process.network_type || "Credenciada"),
              assistance_segment: String(process.assistance_segment || "Ambulatorial + Hospitalar"),
              coparticipation: Boolean(process.coparticipation),
              reimbursement: Boolean(process.reimbursement),
              lives_quantity: Number(process.lives_quantity || 1),
              cancellation_reason: String(process.cancellation_reason || ""),
              notes: String(process.notes || ""),
            }
          : { client_id: clientId || "", responsible_user_id: data.user?.id || "" }),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, process?.id, clientId]);

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!values.client_id) throw new Error("client_required");
      if (!values.responsible_user_id) throw new Error("responsible_required");
      if (values.status === "cancelled" && !values.cancellation_reason.trim())
        throw new Error("reason_required");

      const payload = {
        ...values,
        operator_id: values.operator_id || null,
        cancellation_reason: values.cancellation_reason || null,
        notes: values.notes || null,
        lives_quantity: Number(values.lives_quantity) || 1,
      };

      if (process?.id) {
        const { data, error } = await supabase
          .from("processes")
          .update(payload as never)
          .eq("id", process.id as string)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
      const { data, error } = await supabase
        .from("processes")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      queryClient.invalidateQueries({ queryKey: ["process", id] });
      queryClient.invalidateQueries({ queryKey: ["history", id] });
      toast.success(process?.id ? "Processo atualizado com sucesso." : "Processo criado com sucesso.");
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (e) => {
      const m = (e as Error).message;
      if (m === "client_required") return toast.error("Selecione o cliente.");
      if (m === "responsible_required") return toast.error("Selecione o responsável.");
      if (m === "reason_required") return toast.error("Informe o motivo do cancelamento.");
      toast.error(friendlyError(e, "Não foi possível salvar o processo."));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{process?.id ? "Editar processo" : "Novo processo"}</DialogTitle>
          <DialogDescription>Dados comerciais do plano de saúde.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Wrap label="Cliente *">
            <Select value={values.client_id} onValueChange={(v) => set("client_id", v)} disabled={!!clientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {clientName(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Wrap>

          <Wrap label="Responsável *">
            <Select value={values.responsible_user_id} onValueChange={(v) => set("responsible_user_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Wrap>

          <Wrap label="Operadora">
            <Select value={values.operator_id} onValueChange={(v) => set("operator_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {operators
                  .filter((o) => o.active)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Wrap>

          <SimpleSelect
            label="Tipo de plano"
            value={values.plan_type}
            options={PLAN_TYPES}
            onChange={(v) => set("plan_type", v)}
          />
          <Wrap label="Situação">
            <Select value={values.status} onValueChange={(v) => set("status", v as ProcessStatus)}>
              <SelectTrigger>
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
          </Wrap>
          <Wrap label="Quantidade de vidas">
            <Input
              type="number"
              min={1}
              value={values.lives_quantity}
              onChange={(e) => set("lives_quantity", Number(e.target.value))}
            />
          </Wrap>
          <SimpleSelect
            label="Abrangência"
            value={values.coverage}
            options={COVERAGES}
            onChange={(v) => set("coverage", v)}
          />
          <SimpleSelect
            label="Acomodação"
            value={values.accommodation}
            options={ACCOMMODATIONS}
            onChange={(v) => set("accommodation", v)}
          />
          <SimpleSelect
            label="Rede"
            value={values.network_type}
            options={NETWORK_TYPES}
            onChange={(v) => set("network_type", v)}
          />
          <SimpleSelect
            label="Segmentação assistencial"
            value={values.assistance_segment}
            options={SEGMENTS}
            onChange={(v) => set("assistance_segment", v)}
          />

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label className="text-sm">Coparticipação</Label>
            <Switch checked={values.coparticipation} onCheckedChange={(v) => set("coparticipation", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label className="text-sm">Reembolso</Label>
            <Switch checked={values.reimbursement} onCheckedChange={(v) => set("reimbursement", v)} />
          </div>
        </div>

        {values.status === "cancelled" && (
          <Wrap label="Motivo do cancelamento *">
            <Textarea
              rows={2}
              value={values.cancellation_reason}
              onChange={(e) => set("cancellation_reason", e.target.value)}
            />
          </Wrap>
        )}

        <Wrap label="Observações">
          <Textarea rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        </Wrap>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Salvar processo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Wrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SimpleSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Wrap label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Wrap>
  );
}
