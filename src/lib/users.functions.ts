import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  position?: string;
  role: "admin" | "collaborator";
};

async function isAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  if (!(await isAdmin(context))) throw new Error("Apenas administradores podem gerenciar usuários.");
}

export type StaffMember = {
  id: string;
  name: string;
  position: string | null;
  active: boolean;
  created_at: string;
  role: "admin" | "collaborator";
  email: string | null;
  phone: string | null;
  cpf: string | null;
};

// Lista a equipe. Dados sensíveis (e-mail, telefone, CPF) só saem para o próprio usuário ou administradores.
export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMember[]> => {
    const { data: myRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!myRole) throw new Error("Acesso não autorizado.");
    const admin = myRole.role === "admin";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(error.message);

    return (profiles ?? []).map((p) => {
      const own = admin || p.id === context.userId;
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        active: p.active,
        created_at: p.created_at,
        role: ((roles ?? []).find((r) => r.user_id === p.id)?.role ?? "collaborator") as
          | "admin"
          | "collaborator",
        email: own ? p.email : null,
        phone: own ? p.phone : null,
        cpf: own ? p.cpf : null,
      };
    });
  });

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateUserInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name.trim() },
    });
    if (error || !created.user) throw new Error(error?.message || "Não foi possível criar o acesso.");

    const userId = created.user.id;

    await supabaseAdmin
      .from("profiles")
      .update({ name: data.name.trim(), position: data.position?.trim() || null })
      .eq("id", userId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    return { id: userId };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "collaborator" }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o próprio acesso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
