import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Eye, Trash2, FileText, FileUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useProcesses } from "@/hooks/use-crm";
import { useSession } from "@/hooks/use-session";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { ImportClientDialog } from "@/components/ImportClientDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clientDoc, clientName, friendlyError, type ProcessStatus } from "@/lib/crm";
import { formatDate } from "@/lib/br";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | CRM Garantia e Proteção" },
      { name: "description", content: "Cadastro e consulta de clientes pessoa física e jurídica." },
      { property: "og:title", content: "Clientes | CRM Garantia e Proteção" },
      { property: "og:description", content: "Cadastro e consulta de clientes pessoa física e jurídica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientsPage,
});

type AnyRow = Record<string, unknown> & { id: string };

function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "pf" | "pj">("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AnyRow | null>(null);

  const { data: clients = [], isLoading } = useClients(search);
  const { data: processes = [] } = useProcesses();

  const latestProcess = (clientId: string) =>
    processes.find((p) => (p as { client_id: string }).client_id === clientId) as
      | (Record<string, unknown> & { status: ProcessStatus })
      | undefined;

  const filtered = clients.filter((c) => typeFilter === "all" || c.client_type === typeFilter);

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluído.");
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível excluir o cliente.")),
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} cliente(s) na carteira.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" /> Importar por PDF
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, CPF, CNPJ, e-mail ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pf", "pj"] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {t === "all" ? "Todos" : t === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado.
        </p>
      )}

      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">CPF/CNPJ</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Operadora</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const proc = latestProcess(c.id);
              return (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{clientName(c)}</td>
                  <td className="px-4 py-3">{clientDoc(c)}</td>
                  <td className="px-4 py-3">{c.client_type === "pf" ? "PF" : "PJ"}</td>
                  <td className="px-4 py-3">{c.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {(proc as { operators?: { name?: string } })?.operators?.name || "—"}
                  </td>
                  <td className="px-4 py-3">{proc ? <StatusBadge status={proc.status} /> : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Actions
                        onView={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                        onEdit={() => {
                          setEditing(c as AnyRow);
                          setOpen(true);
                        }}
                        onDelete={session?.isAdmin ? () => setPendingDelete(c as AnyRow) : undefined}
                        id={c.id}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="grid gap-3 lg:hidden">
        {filtered.map((c) => {
          const proc = latestProcess(c.id);
          return (
            <Card key={c.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to="/clientes/$id" params={{ id: c.id }} className="truncate font-medium hover:underline">
                      {clientName(c)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.client_type === "pf" ? "PF" : "PJ"} · {clientDoc(c)}
                    </p>
                  </div>
                  {proc && <StatusBadge status={proc.status} />}
                </div>
                <p className="text-xs text-muted-foreground">{c.phone || "Sem telefone"}</p>
                <div className="flex justify-end gap-1">
                  <Actions
                    onView={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                    onEdit={() => {
                      setEditing(c as AnyRow);
                      setOpen(true);
                    }}
                    onDelete={session?.isAdmin ? () => setPendingDelete(c as AnyRow) : undefined}
                    id={c.id}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ImportClientDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSaved={(id) => navigate({ to: "/clientes/$id", params: { id } })}
      />

      <ClientFormDialog
        open={open}
        onOpenChange={setOpen}
        client={editing as never}
        onSaved={(id) => navigate({ to: "/clientes/$id", params: { id } })}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente sai das listagens, mas o histórico é preservado e pode ser recuperado pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) softDelete.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Actions({
  id,
  onView,
  onEdit,
  onDelete,
}: {
  id: string;
  onView: () => void;
  onEdit: () => void;
  onDelete?: (() => void) | undefined;
}) {
  return (
    <>
      <Button size="icon" variant="ghost" onClick={onView} aria-label="Visualizar">
        <Eye className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" asChild aria-label="Documentos">
        <Link to="/clientes/$id" params={{ id }} search={{ tab: "documentos" }}>
          <FileText className="h-4 w-4" />
        </Link>
      </Button>
      {onDelete && (
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Excluir">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </>
  );
}
