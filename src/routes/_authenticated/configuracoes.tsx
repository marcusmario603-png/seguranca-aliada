import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOperators } from "@/hooks/use-crm";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { friendlyError } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Configurações | CRM Garantia e Proteção" },
      { name: "description", content: "Gerencie as operadoras de plano de saúde disponíveis no CRM." },
      { property: "og:title", content: "Configurações | CRM Garantia e Proteção" },
      { property: "og:description", content: "Gerencie as operadoras de plano de saúde disponíveis no CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: operators = [] } = useOperators();
  const [name, setName] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["operators"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("name_required");
      const { error } = await supabase.from("operators").insert({ name: name.trim() } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setName("");
      toast.success("Operadora cadastrada.");
    },
    onError: (e) =>
      toast.error(
        (e as Error).message === "name_required"
          ? "Informe o nome da operadora."
          : friendlyError(e, "Não foi possível cadastrar a operadora."),
      ),
  });

  const toggle = useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const { error } = await supabase.from("operators").update({ active: input.active }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Operadora atualizada.");
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível atualizar a operadora.")),
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Operadoras disponíveis para os processos.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operadoras</CardTitle>
          <CardDescription>
            {session?.isAdmin ? "Cadastre e ative operadoras." : "Somente administradores podem alterar esta lista."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session?.isAdmin && (
            <div className="flex gap-2">
              <Input placeholder="Nome da operadora" value={name} onChange={(e) => setName(e.target.value)} />
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>
          )}
          <div className="divide-y rounded-lg border">
            {operators.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium">{o.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{o.active ? "Ativa" : "Inativa"}</span>
                  <Switch
                    checked={o.active}
                    disabled={!session?.isAdmin}
                    onCheckedChange={(v) => toggle.mutate({ id: o.id, active: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
