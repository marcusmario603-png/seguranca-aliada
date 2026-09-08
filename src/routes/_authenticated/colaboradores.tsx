import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUserAccount, deleteUserAccount } from "@/lib/users.functions";
import { friendlyError } from "@/lib/crm";
import { formatDate } from "@/lib/br";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores | CRM Garantia e Proteção" },
      { name: "description", content: "Equipe com acesso ao CRM, perfis e situação de cada colaborador." },
      { property: "og:title", content: "Colaboradores | CRM Garantia e Proteção" },
      { property: "og:description", content: "Equipe com acesso ao CRM, perfis e situação de cada colaborador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollaboratorsPage,
});

function CollaboratorsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const { data: people = [] } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (profiles || []).map((p) => ({
        ...p,
        role: (roles || []).find((r) => r.user_id === p.id)?.role || "collaborator",
      }));
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const { error } = await supabase.from("profiles").update({ active: input.active }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      toast.success("Colaborador atualizado.");
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível atualizar o colaborador.")),
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Colaboradores</h1>
        <p className="text-sm text-muted-foreground">
          Cada colaborador cria o próprio acesso na tela de login; o administrador controla a situação.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {people.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {p.role === "admin" ? "Administrador" : "Colaborador"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.position || "Sem cargo definido"} · desde {formatDate(p.created_at)}
              </p>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm">{p.active ? "Ativo" : "Inativo"}</span>
                <Switch
                  checked={p.active}
                  disabled={!session?.isAdmin}
                  onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!session?.isAdmin && (
        <p className="text-xs text-muted-foreground">Somente administradores podem ativar ou desativar acessos.</p>
      )}
    </div>
  );
}
