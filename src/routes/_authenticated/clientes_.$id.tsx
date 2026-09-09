import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { ProcessFormDialog } from "@/components/ProcessFormDialog";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { clientDoc, clientName, type ProcessStatus } from "@/lib/crm";
import { formatDate, formatDateTime } from "@/lib/br";

export const Route = createFileRoute("/_authenticated/clientes_/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Ficha do cliente | CRM Garantia e Proteção" },
      { name: "description", content: "Dados cadastrais, processos, documentos e histórico do cliente." },
      { property: "og:title", content: "Ficha do cliente | CRM Garantia e Proteção" },
      { property: "og:description", content: "Dados cadastrais, processos, documentos e histórico do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState("informacoes");
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);

  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["client-processes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("*, operators(name), profiles:responsible_user_id(name)")
        .eq("client_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["client-history", id, processes.map((p) => p.id).join(",")],
    enabled: processes.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_history")
        .select("*, profiles:user_id(name)")
        .in(
          "process_id",
          processes.map((p) => p.id),
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (!client) return <p className="text-sm text-muted-foreground">Carregando cliente…</p>;

  const info: [string, string][] =
    client.client_type === "pf"
      ? [
          ["Nome completo", client.full_name || "—"],
          ["CPF", client.cpf || "—"],
          ["Nascimento", formatDate(client.birth_date)],
        ]
      : [
          ["Razão social", client.company_name || "—"],
          ["Nome fantasia", client.trade_name || "—"],
          ["CNPJ", client.cnpj || "—"],
        ];

  const contact: [string, string][] = [
    ["E-mail", client.email || "—"],
    ["Telefone", client.phone || "—"],
    ["WhatsApp", client.whatsapp || "—"],
    ["CEP", client.zip_code || "—"],
    ["Endereço", [client.address, client.number, client.complement].filter(Boolean).join(", ") || "—"],
    ["Cidade/UF", [client.city, client.state].filter(Boolean).join(" / ") || "—"],
    ["Bairro", client.neighborhood || "—"],
    ["Observações", client.notes || "—"],
  ];

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/clientes">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-5">
        <div>
          <h1 className="text-xl font-semibold">{clientName(client)}</h1>
          <p className="text-sm text-muted-foreground">
            {client.client_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} · {clientDoc(client)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {processes[0] && <StatusBadge status={processes[0].status as ProcessStatus} />}
            <span className="text-xs text-muted-foreground">
              Responsável: {(processes[0] as { profiles?: { name?: string } })?.profiles?.name || "—"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button onClick={() => setProcessOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo processo
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
          <TabsTrigger value="processos">Processos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="informacoes" className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {info.map(([k, v]) => (
                <Row key={k} label={k} value={v} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contato e endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {contact.map(([k, v]) => (
                <Row key={k} label={k} value={v} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processos" className="mt-4 space-y-3">
          {processes.length === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum processo cadastrado para este cliente.
            </p>
          )}
          {processes.map((p) => (
            <Link
              key={p.id}
              to="/processos/$id"
              params={{ id: p.id }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-4 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-medium">
                  {p.plan_type} · {p.operators?.name || "Sem operadora"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.lives_quantity} vida(s) · criado em {formatDate(p.created_at)}
                </p>
              </div>
              <StatusBadge status={p.status as ProcessStatus} />
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <DocumentsPanel clientId={id} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4 space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>}
          {history.map((h) => (
            <div key={h.id} className="rounded-lg border bg-card px-4 py-3 text-sm">
              <span className="text-muted-foreground">{formatDateTime(h.created_at)}</span> —{" "}
              {h.action === "created" ? "Processo criado" : "Situação alterada"} para{" "}
              <strong>{h.new_status}</strong> por {(h as { profiles?: { name?: string } }).profiles?.name || "sistema"}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client as never} />
      <ProcessFormDialog open={processOpen} onOpenChange={setProcessOpen} clientId={id} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value}</span>
    </div>
  );
}
