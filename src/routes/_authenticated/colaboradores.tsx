import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, UserPlus } from "lucide-react";
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
import { createUserAccount, deleteUserAccount, listStaff, updateUserRole } from "@/lib/users.functions";
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

  const staffFn = useServerFn(listStaff);
  const { data: people = [] } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => staffFn({}),
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

  const createFn = useServerFn(createUserAccount);
  const deleteFn = useServerFn(deleteUserAccount);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    position: "",
    role: "collaborator" as "admin" | "collaborator",
  });

  const createUser = useMutation({
    mutationFn: async () => createFn({ data: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Usuário cadastrado.");
      setOpen(false);
      setForm({ name: "", email: "", password: "", position: "", role: "collaborator" });
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível cadastrar o usuário.")),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Usuário excluído.");
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível excluir o usuário.")),
  });

  const roleFn = useServerFn(updateUserRole);
  const [editing, setEditing] = useState<null | {
    id: string;
    name: string;
    position: string;
    phone: string;
    cpf: string;
    role: "admin" | "collaborator";
    originalRole: "admin" | "collaborator";
  }>(null);

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editing.name.trim(),
          position: editing.position.trim() || null,
          phone: editing.phone.trim() || null,
          cpf: editing.cpf.trim() || null,
        })
        .eq("id", editing.id);
      if (error) throw error;
      if (session?.isAdmin && editing.role !== editing.originalRole) {
        await roleFn({ data: { userId: editing.id, role: editing.role } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Dados atualizados.");
      setEditing(null);
    },
    onError: (e) => toast.error(friendlyError(e, "Não foi possível salvar as alterações.")),
  });

  function submitCreate() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Preencha nome, e-mail e uma senha com no mínimo 6 caracteres.");
      return;
    }
    createUser.mutate();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Somente administradores podem cadastrar, ativar/desativar e excluir usuários.
          </p>
        </div>
        {session?.isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Novo usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar usuário</DialogTitle>
                <DialogDescription>O acesso já fica liberado com a senha definida aqui.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="u-name">Nome</Label>
                  <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="u-email">E-mail</Label>
                  <Input
                    id="u-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="u-pass">Senha provisória</Label>
                  <Input
                    id="u-pass"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="u-position">Cargo</Label>
                  <Input
                    id="u-position"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Perfil</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as "admin" | "collaborator" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collaborator">Colaborador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submitCreate} disabled={createUser.isPending}>
                  {createUser.isPending ? "Cadastrando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.active}
                    disabled={!session?.isAdmin}
                    onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })}
                  />
                  {(session?.isAdmin || p.id === session?.userId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${p.name}`}
                      onClick={() =>
                        setEditing({
                          id: p.id,
                          name: p.name || "",
                          position: p.position || "",
                          phone: p.phone || "",
                          cpf: p.cpf || "",
                          role: p.role as "admin" | "collaborator",
                          originalRole: p.role as "admin" | "collaborator",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {session?.isAdmin && p.id !== session.userId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Excluir ${p.name}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                          <AlertDialogDescription>
                            O acesso de {p.name} será removido definitivamente. Os registros criados por ele
                            permanecem no sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeUser.mutate(p.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar dados</DialogTitle>
            <DialogDescription>Atualize nome, cargo e contato do colaborador.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="e-name">Nome</Label>
                <Input
                  id="e-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-position">Cargo</Label>
                <Input
                  id="e-position"
                  value={editing.position}
                  onChange={(e) => setEditing({ ...editing, position: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-phone">Telefone</Label>
                <Input
                  id="e-phone"
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-cpf">CPF</Label>
                <Input id="e-cpf" value={editing.cpf} onChange={(e) => setEditing({ ...editing, cpf: e.target.value })} />
              </div>
              {session?.isAdmin && (
                <div className="grid gap-1.5">
                  <Label>Perfil</Label>
                  <Select
                    value={editing.role}
                    onValueChange={(v) => setEditing({ ...editing, role: v as "admin" | "collaborator" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collaborator">Colaborador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!editing?.name.trim()) {
                  toast.error("Informe o nome.");
                  return;
                }
                saveEdit.mutate();
              }}
              disabled={saveEdit.isPending}
            >
              {saveEdit.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!session?.isAdmin && (
        <p className="text-xs text-muted-foreground">Somente administradores podem ativar ou desativar acessos.</p>
      )}
    </div>
  );
}
