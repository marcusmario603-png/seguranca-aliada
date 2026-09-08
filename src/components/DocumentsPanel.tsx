import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Trash2, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DOC_TYPES, friendlyError } from "@/lib/crm";
import { formatBytes, formatDateTime } from "@/lib/br";

export function useDocuments(filter: { clientId?: string | undefined; processId?: string | undefined } = {}) {
  return useQuery({
    queryKey: ["documents", filter.clientId ?? null, filter.processId ?? null],
    queryFn: async () => {
      let q = supabase
        .from("documents")
        .select("*, clients(id, client_type, full_name, company_name, trade_name), profiles:uploaded_by(name)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter.clientId) q = q.eq("client_id", filter.clientId);
      if (filter.processId) q = q.eq("process_id", filter.processId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function DocumentsPanel({ clientId, processId }: { clientId: string; processId?: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("Outros");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; storage_path: string } | null>(null);
  const { data: documents = [], isLoading } = useDocuments({ clientId, processId });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const safe = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${clientId}/${processId || "geral"}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("documents").insert({
        client_id: clientId,
        process_id: processId || null,
        uploaded_by: uid,
        original_name: file.name,
        doc_type: docType,
        storage_path: path,
        mime_type: file.type,
        file_size: file.size,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento enviado com sucesso.");
      if (inputRef.current) inputRef.current.value = "";
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível enviar o documento.")),
  });

  const remove = useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("documents").remove([doc.storage_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento excluído.");
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível excluir o documento.")),
  });

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Não foi possível abrir o documento."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo de documento</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
          }}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          <Upload className="mr-2 h-4 w-4" /> Enviar arquivo
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando documentos…</p>}
      {!isLoading && documents.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum documento anexado.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {documents.map((d) => (
          <div key={d.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.original_name}</p>
              <p className="text-xs text-muted-foreground">
                {d.doc_type} · {formatBytes(d.file_size)} · {formatDateTime(d.created_at)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => openDoc(d.storage_path)} aria-label="Abrir">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPendingDelete({ id: d.id, storage_path: d.storage_path })}
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete);
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
