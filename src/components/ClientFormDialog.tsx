import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isValidCNPJ, isValidCPF, maskCEP, maskCNPJ, maskCPF, maskPhone, onlyDigits } from "@/lib/br";
import { friendlyError } from "@/lib/crm";

const schema = z
  .object({
    client_type: z.enum(["pf", "pj"]),
    full_name: z.string().trim().max(150).optional().or(z.literal("")),
    company_name: z.string().trim().max(150).optional().or(z.literal("")),
    trade_name: z.string().trim().max(150).optional().or(z.literal("")),
    cpf: z.string().optional().or(z.literal("")),
    cnpj: z.string().optional().or(z.literal("")),
    birth_date: z.string().optional().or(z.literal("")),
    email: z.string().trim().email("E-mail inválido.").max(255).optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    whatsapp: z.string().optional().or(z.literal("")),
    zip_code: z.string().optional().or(z.literal("")),
    state: z.string().max(2).optional().or(z.literal("")),
    city: z.string().max(100).optional().or(z.literal("")),
    neighborhood: z.string().max(100).optional().or(z.literal("")),
    address: z.string().max(150).optional().or(z.literal("")),
    number: z.string().max(20).optional().or(z.literal("")),
    complement: z.string().max(100).optional().or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.client_type === "pf") {
      if (!v.full_name) ctx.addIssue({ code: "custom", path: ["full_name"], message: "Nome é obrigatório." });
      if (!v.cpf) ctx.addIssue({ code: "custom", path: ["cpf"], message: "CPF é obrigatório." });
      else if (!isValidCPF(v.cpf)) ctx.addIssue({ code: "custom", path: ["cpf"], message: "CPF inválido." });
    } else {
      if (!v.company_name)
        ctx.addIssue({ code: "custom", path: ["company_name"], message: "Razão social é obrigatória." });
      if (!v.cnpj) ctx.addIssue({ code: "custom", path: ["cnpj"], message: "CNPJ é obrigatório." });
      else if (!isValidCNPJ(v.cnpj)) ctx.addIssue({ code: "custom", path: ["cnpj"], message: "CNPJ inválido." });
    }
  });

export type ClientFormValues = z.infer<typeof schema>;
type ClientRow = Partial<ClientFormValues> & { id?: string };

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client?: ClientRow | null;
  onSaved?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<"pf" | "pj">((client?.client_type as "pf" | "pj") || "pf");

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { client_type: "pf" },
  });

  useEffect(() => {
    if (!open) return;
    const t = (client?.client_type as "pf" | "pj") || "pf";
    setType(t);
    form.reset({
      client_type: t,
      full_name: client?.full_name || "",
      company_name: client?.company_name || "",
      trade_name: client?.trade_name || "",
      cpf: client?.cpf || "",
      cnpj: client?.cnpj || "",
      birth_date: client?.birth_date || "",
      email: client?.email || "",
      phone: client?.phone || "",
      whatsapp: client?.whatsapp || "",
      zip_code: client?.zip_code || "",
      state: client?.state || "",
      city: client?.city || "",
      neighborhood: client?.neighborhood || "",
      address: client?.address || "",
      number: client?.number || "",
      complement: client?.complement || "",
      notes: client?.notes || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const payload: Record<string, unknown> = {
        ...values,
        client_type: type,
        full_name: type === "pf" ? values.full_name : null,
        birth_date: type === "pf" && values.birth_date ? values.birth_date : null,
        company_name: type === "pj" ? values.company_name : null,
        trade_name: type === "pj" ? values.trade_name || null : null,
        cpf: type === "pf" ? values.cpf : null,
        cnpj: type === "pj" ? values.cnpj : null,
      };
      for (const k of Object.keys(payload)) if (payload[k] === "") payload[k] = null;

      const doc = type === "pf" ? values.cpf : values.cnpj;
      const column = type === "pf" ? "cpf" : "cnpj";
      let dup = supabase.from("clients").select("id").eq(column, doc!).is("deleted_at", null);
      if (client?.id) dup = dup.neq("id", client.id);
      const { data: existing } = await dup.maybeSingle();
      if (existing) throw new Error(type === "pf" ? "clients_cpf_key" : "clients_cnpj_key");

      if (client?.id) {
        const { data, error } = await supabase
          .from("clients")
          .update(payload as never)
          .eq("id", client.id)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...payload, created_by: userData.user?.id } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      toast.success(client?.id ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível salvar o cliente.")),
  });

  const err = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Informe os dados do cliente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(v) => {
              setType(v as "pf" | "pj");
              form.setValue("client_type", v as "pf" | "pj");
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pf">Pessoa Física</TabsTrigger>
              <TabsTrigger value="pj">Pessoa Jurídica</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            {type === "pf" ? (
              <>
                <Field label="Nome completo *" error={err.full_name?.message}>
                  <Input {...form.register("full_name")} />
                </Field>
                <Field label="CPF *" error={err.cpf?.message}>
                  <Input
                    value={form.watch("cpf") || ""}
                    onChange={(e) => form.setValue("cpf", maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Data de nascimento">
                  <Input type="date" {...form.register("birth_date")} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Razão social *" error={err.company_name?.message}>
                  <Input {...form.register("company_name")} />
                </Field>
                <Field label="Nome fantasia">
                  <Input {...form.register("trade_name")} />
                </Field>
                <Field label="CNPJ *" error={err.cnpj?.message}>
                  <Input
                    value={form.watch("cnpj") || ""}
                    onChange={(e) => form.setValue("cnpj", maskCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                  />
                </Field>
              </>
            )}

            <Field label="E-mail" error={err.email?.message}>
              <Input type="email" {...form.register("email")} />
            </Field>
            <Field label="Telefone">
              <Input
                value={form.watch("phone") || ""}
                onChange={(e) => form.setValue("phone", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={form.watch("whatsapp") || ""}
                onChange={(e) => form.setValue("whatsapp", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </Field>
            <Field label="CEP">
              <Input
                value={form.watch("zip_code") || ""}
                onChange={(e) => form.setValue("zip_code", maskCEP(e.target.value))}
                onBlur={async (e) => {
                  const cep = onlyDigits(e.target.value);
                  if (cep.length !== 8) return;
                  try {
                    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await res.json();
                    if (data.erro) return;
                    form.setValue("state", data.uf || "");
                    form.setValue("city", data.localidade || "");
                    form.setValue("neighborhood", data.bairro || "");
                    form.setValue("address", data.logradouro || "");
                  } catch {
                    /* endereço preenchido manualmente */
                  }
                }}
                placeholder="00000-000"
                inputMode="numeric"
              />
            </Field>
            <Field label="Estado">
              <Input maxLength={2} {...form.register("state")} />
            </Field>
            <Field label="Cidade">
              <Input {...form.register("city")} />
            </Field>
            <Field label="Bairro">
              <Input {...form.register("neighborhood")} />
            </Field>
            <Field label="Endereço">
              <Input {...form.register("address")} />
            </Field>
            <Field label="Número">
              <Input {...form.register("number")} />
            </Field>
            <Field label="Complemento">
              <Input {...form.register("complement")} />
            </Field>
          </div>

          <Field label="Observações">
            <Textarea rows={3} {...form.register("notes")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Salvar cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
