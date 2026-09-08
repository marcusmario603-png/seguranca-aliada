import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useOperators, useProcesses, useProfiles } from "@/hooks/use-crm";
import { ProcessFormDialog } from "@/components/ProcessFormDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_STATUSES, PLAN_TYPES, STATUS_LABEL, clientName, type ProcessStatus } from "@/lib/crm";
import { formatDate } from "@/lib/br";

export const Route = createFileRoute("/_authenticated/processos")({
  head: () => ({
    meta: [
      { title: "Processos | CRM Garantia e Proteção" },
      { name: "description", content: "Consulta e cadastro de processos comerciais de plano de saúde." },
      { property: "og:title", content: "Processos | CRM Garantia e Proteção" },
      { property: "og:description", content: "Consulta e cadastro de processos comerciais de plano de saúde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProcessesPage,
});

function ProcessesPage() {
  const { data: processes = [], isLoading } = useProcesses();
  const { data: operators = [] } = useOperators();
  const { data: profiles = [] } = useProfiles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [operator, setOperator] = useState("all");
  const [responsible, setResponsible] = useState("all");
  const [plan, setPlan] = useState("all");

  const filtered = processes.filter((p) => {
    const c = p.clients;
    const term = search.trim().toLowerCase();
    const matches =
      !term ||
      clientName(c).toLowerCase().includes(term) ||
      String(c.cpf || "").includes(term) ||
      String(c.cnpj || "").includes(term) ||
      String(p.code || "").includes(term);
    return (
      matches &&
      (status === "all" || p.status === status) &&
      (operator === "all" || p.operator_id === operator) &&
      (responsible === "all" || p.responsible_user_id === responsible) &&
      (plan === "all" || p.plan_type === plan)
    );
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Processos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} processo(s) encontrado(s).</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo processo
        </Button>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cliente, CPF/CNPJ ou nº"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Filter value={status} onChange={setStatus} placeholder="Situação">
          {ALL_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </Filter>
        <Filter value={operator} onChange={setOperator} placeholder="Operadora">
          {operators.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </Filter>
        <Filter value={responsible} onChange={setResponsible} placeholder="Responsável">
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </Filter>
        <Filter value={plan} onChange={setPlan} placeholder="Tipo de plano">
          {PLAN_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </Filter>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum processo encontrado.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="transition-shadow hover:shadow-md">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to="/processos/$id" params={{ id: p.id }} className="font-medium hover:underline">
                  {clientName(p.clients)}
                </Link>
                <StatusBadge status={p.status as ProcessStatus} />
              </div>
              <p className="text-xs text-muted-foreground">
                #{p.code} · {p.plan_type} · {p.operators?.name || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.lives_quantity} vida(s) · Resp.:{" "}
                {p.profiles?.name || "—"} · {formatDate(p.updated_at)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProcessFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Filter({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}: todos</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}
