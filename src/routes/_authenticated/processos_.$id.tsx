import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProcess } from "@/hooks/use-crm";
import { useMoveProcess } from "./pipeline";
import { StatusBadge } from "@/components/StatusBadge";
import { ProcessFormDialog } from "@/components/ProcessFormDialog";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALL_STATUSES,
  RELATIONSHIPS,
  STATUS_LABEL,
  clientName,
  friendlyError,
  type ProcessStatus,
} from "@/lib/crm";
import { calcAge, formatDate, formatDateTime, maskCPF } from "@/lib/br";

export const Route = createFileRoute("/_authenticated/processos_/$id")({
  head: () => ({
    meta: [
      { title: "Processo | CRM Garantia e Proteção" },
      { name: "description", content: "Detalhes do processo, beneficiários, documentos e histórico." },
      { property: "og:title", content: "Processo | CRM Garantia e Proteção" },
      { property: "og:description", content: "Detalhes do processo, beneficiários, documentos e histórico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProcessDetail,
});

function ProcessDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: process } = useProcess(id);
  const move = useMoveProcess();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [benOpen, setBenOpen] = useState(false);
  const [ben, setBen] = useState({ name: "", cpf: "", birth_date: "", relationship: "Titular" });

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiaries", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("process_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_history")
        .select("*, profiles:user_id(name)")
        .eq("process_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addBen = useMutation({
    mutationFn: async () => {
      if (!ben.name.trim()) throw new Error("name_required");
      const { error } = await supabase.from("beneficiaries").insert({
        process_id: id,
        name: ben.name,
        cpf: ben.cpf || null,
        birth_date: ben.birth_date || null,
        relationship: ben.relationship,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries", id] });
      setBen({ name: "", cpf: "", birth_date: "", relationship: "Titular" });
      setBenOpen(false);
      toast.success("Beneficiário adicionado.");
    },
    onError: (e) =>
      toast.error(
        (e as Error).message === "name_required"
          ? "Nome do beneficiário é obrigatório."
          : friendlyError(e, "Não foi possível adicionar o beneficiário."),
      ),
  });

  const removeBen = useMutation({
    mutationFn: async (benId: string) => {
      const { error } = await supabase.from("beneficiaries").delete().eq("id", benId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries", id] });
      toast.success("Beneficiário removido.");
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível remover o beneficiário.")),
  });

  if (!process) return <p className="text-sm text-muted-foreground">Carregando processo…</p>;

  const client = process.clients;
  const details: [string, string][] = [
    ["Operadora", process.operators?.name || "—"],
    ["Tipo de plano", process.plan_type],
    ["Responsável", process.profiles?.name || "—"],
    ["Abrangência", process.coverage || "—"],
    ["Acomodação", process.accommodation || "—"],
    ["Rede", process.network_type || "—"],
    ["Segmentação", process.assistance_segment || "—"],
    ["Coparticipação", process.coparticipation ? "Sim" : "Não"],
    ["Reembolso", process.reimbursement ? "Sim" : "Não"],
    ["Vidas", String(process.lives_quantity)],
    ["Proposta em", formatDate(process.proposal_date)],
    ["Assinatura", formatDate(process.signed_date)],
    ["Vigência", formatDate(process.effective_date)],
    ["Cancelado em", formatDate(process.cancelled_date)],
    ["Motivo cancelamento", process.cancellation_reason || "—"],
    ["Observações", process.notes || "—"],
  ];

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/processos">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-5">
        <div>
          <Link to="/clientes/$id" params={{ id: client.id }} className="text-xl font-semibold hover:underline">
            {clientName(client)}
          </Link>
          <p className="text-sm text-muted-foreground">
            Processo #{process.code} · {process.plan_type}
          </p>
          <div className="mt-2">
            <StatusBadge status={process.status as ProcessStatus} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={process.status}
            onValueChange={(v) => {
              if (v === "cancelled") {
                setReason("");
                setCancelOpen(true);
                return;
              }
              move.mutate({ id, status: v as ProcessStatus });
            }}
          >
            <SelectTrigger className="w-52">
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
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {details.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b pb-2 last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-medium break-words">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Beneficiários</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setBenOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {beneficiaries.length === 0 && <p className="text-sm text-muted-foreground">Nenhum beneficiário.</p>}
            {beneficiaries.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.relationship} · {b.cpf || "sem CPF"}
                    {b.birth_date ? ` · ${calcAge(b.birth_date)} anos` : ""}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeBen.mutate(b.id)} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos do processo</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsPanel clientId={client.id} processId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {history.length === 0 && <p className="text-muted-foreground">Sem movimentações.</p>}
          {history.map((h) => (
            <div key={h.id} className="border-b pb-2 last:border-0">
              <span className="text-muted-foreground">{formatDateTime(h.created_at)}</span> —{" "}
              {h.action === "created" ? "Processo criado" : "Situação alterada"} para{" "}
              <strong>{STATUS_LABEL[h.new_status as ProcessStatus]}</strong> por{" "}
              {(h as { profiles?: { name?: string } }).profiles?.name || "sistema"}
              {h.notes ? ` — ${h.notes}` : ""}
            </div>
          ))}
        </CardContent>
      </Card>

      <ProcessFormDialog open={editOpen} onOpenChange={setEditOpen} process={process as never} />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo do cancelamento</DialogTitle>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) { toast.error("Informe o motivo do cancelamento."); return; }
                move.mutate({ id, status: "cancelled", reason });
                setCancelOpen(false);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={benOpen} onOpenChange={setBenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo beneficiário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input value={ben.name} onChange={(e) => setBen({ ...ben, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CPF</Label>
              <Input value={ben.cpf} onChange={(e) => setBen({ ...ben, cpf: maskCPF(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
              <Input
                type="date"
                value={ben.birth_date}
                onChange={(e) => setBen({ ...ben, birth_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Grau de parentesco</Label>
              <Select value={ben.relationship} onValueChange={(v) => setBen({ ...ben, relationship: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => addBen.mutate()} disabled={addBen.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
