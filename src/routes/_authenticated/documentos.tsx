import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDocuments } from "@/components/DocumentsPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clientName } from "@/lib/crm";
import { formatBytes, formatDateTime } from "@/lib/br";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos | CRM Garantia e Proteção" },
      { name: "description", content: "Arquivos de clientes e processos armazenados com acesso protegido." },
      { property: "og:title", content: "Documentos | CRM Garantia e Proteção" },
      { property: "og:description", content: "Arquivos de clientes e processos armazenados com acesso protegido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data: documents = [], isLoading } = useDocuments();
  const [search, setSearch] = useState("");

  const filtered = documents.filter((d) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const c = (d as { clients?: Parameters<typeof clientName>[0] }).clients;
    return (
      d.original_name.toLowerCase().includes(term) ||
      d.doc_type.toLowerCase().includes(term) ||
      (c ? clientName(c).toLowerCase().includes(term) : false)
    );
  });

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Não foi possível abrir o documento.");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Arquivos protegidos, acessíveis apenas por colaboradores autenticados.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por arquivo, tipo ou cliente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum documento encontrado.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((d) => {
          const c = (d as { clients?: Parameters<typeof clientName>[0] & { id: string } }).clients;
          return (
            <Card key={d.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.original_name}</p>
                  {c && (
                    <Link to="/clientes/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline">
                      {clientName(c)}
                    </Link>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {d.doc_type} · {formatBytes(d.file_size)} · {formatDateTime(d.created_at)}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openDoc(d.storage_path)} aria-label="Abrir">
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
