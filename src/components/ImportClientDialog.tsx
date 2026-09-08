import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { useOperators } from "@/hooks/use-crm";
import { extractPdfText } from "@/lib/pdf-text";
import { extractProposalData, type ExtractedProposal } from "@/lib/proposals.functions";
import { formatDate } from "@/lib/br";

const ERRORS: Record<string, string> = {
  pdf_sem_texto: "Não foi possível ler texto neste PDF. Ele pode ser uma imagem digitalizada.",
  ia_indisponivel: "A leitura automática está indisponível no momento.",
  limite_ia: "Muitas leituras em pouco tempo. Tente novamente em instantes.",
  creditos_ia: "Créditos de leitura automática esgotados.",
  falha_ia: "Não foi possível analisar o documento agora.",
  falha_leitura: "Não conseguimos identificar os dados dentro deste documento.",
};

export function ImportClientDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: operators = [] } = useOperators();
  const extract = useServerFn(extractProposalData);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedProposal | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const read = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await extractPdfText(file);
      const data = await extract({
        data: { text, operators: operators.map((o) => o.name) },
      });
      setResult(data);
      toast.success("Documento lido. Confira os dados antes de salvar.");
    } catch (e) {
      const key = (e as Error).message;
      toast.error(ERRORS[key] || "Não foi possível ler o documento.");
    } finally {
      setLoading(false);
    }
  };

  const afterSaved = async (clientId: string) => {
    try {
      if (file) {
        const safe = file.name.replace(/[^\w.\-]/g, "_");
        const path = `${clientId}/geral/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
        if (!upErr) {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.from("documents").insert({
            client_id: clientId,
            uploaded_by: userData.user?.id,
            original_name: file.name,
            doc_type: "Proposta",
            storage_path: path,
            mime_type: file.type,
            file_size: file.size,
          } as never);
        }
      }

      const dependents = result?.dependents ?? [];
      if (dependents.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const operator = operators.find(
          (o) => result?.operator_name && o.name.toLowerCase().includes(result.operator_name.toLowerCase().slice(0, 5)),
        );
        const { data: proc } = await supabase
          .from("processes")
          .insert({
            client_id: clientId,
            responsible_user_id: userData.user?.id ?? null,
            operator_id: operator?.id ?? null,
            plan_type: "Familiar",
            lives_quantity: dependents.length + 1,
            notes: "Criado a partir da importação de proposta em PDF.",
          } as never)
          .select("id")
          .single();

        if (proc?.id) {
          const titular = result?.full_name || result?.company_name || "Titular";
          await supabase.from("beneficiaries").insert([
            {
              process_id: proc.id,
              name: titular,
              cpf: result?.cpf ?? null,
              birth_date: result?.birth_date ?? null,
              relationship: "Titular",
            },
            ...dependents.map((d) => ({
              process_id: proc.id,
              name: d.name,
              cpf: d.cpf ?? null,
              birth_date: d.birth_date ?? null,
              relationship: d.relationship || "Dependente",
            })),
          ] as never);
        }
      }
    } catch {
      toast.warning("Cliente salvo, mas alguns dados extras não puderam ser gravados.");
    }

    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["processes"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    reset();
    onOpenChange(false);
    onSaved?.(clientId);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          onOpenChange(v);
        }}
      >
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar cliente por proposta (PDF)</DialogTitle>
            <DialogDescription>
              Envie a proposta da operadora. Os dados do titular e dos dependentes são preenchidos automaticamente
              para você conferir antes de salvar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/40">
              <FileUp className="h-6 w-6" />
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <span>Clique para escolher o arquivo PDF da proposta</span>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  setResult(null);
                  setFile(e.target.files?.[0] ?? null);
                }}
              />
            </label>

            {result && (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
                <p className="font-medium">Dados identificados</p>
                <Line label="Tipo" value={result.client_type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"} />
                <Line label="Nome" value={result.full_name || result.company_name} />
                <Line label="CPF/CNPJ" value={result.cpf || result.cnpj} />
                <Line label="Nascimento" value={result.birth_date ? formatDate(result.birth_date) : null} />
                <Line label="E-mail" value={result.email} />
                <Line label="Telefone" value={result.phone} />
                <Line label="Operadora" value={result.operator_name} />
                {result.dependents.length > 0 && (
                  <div className="pt-1">
                    <p className="font-medium">Dependentes ({result.dependents.length})</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {result.dependents.map((d, i) => (
                        <li key={i}>
                          {d.name}
                          {d.relationship ? ` · ${d.relationship}` : ""}
                          {d.birth_date ? ` · ${formatDate(d.birth_date)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {result ? (
              <Button onClick={() => setReviewOpen(true)}>Conferir e cadastrar</Button>
            ) : (
              <Button onClick={read} disabled={!file || loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Ler documento
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result && (
        <ClientFormDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          client={{
            client_type: result.client_type,
            full_name: result.full_name || "",
            company_name: result.company_name || "",
            trade_name: result.trade_name || "",
            cpf: result.cpf || "",
            cnpj: result.cnpj || "",
            birth_date: result.birth_date || "",
            email: result.email || "",
            phone: result.phone || "",
            whatsapp: result.whatsapp || "",
            zip_code: result.zip_code || "",
            state: result.state || "",
            city: result.city || "",
            neighborhood: result.neighborhood || "",
            address: result.address || "",
            number: result.number || "",
            complement: result.complement || "",
          }}
          onSaved={(id) => {
            setReviewOpen(false);
            void afterSaved(id);
          }}
        />
      )}
    </>
  );
}

function Line({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </p>
  );
}
