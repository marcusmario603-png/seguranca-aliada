import { createServerFn } from "@tanstack/react-start";

type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  position?: string;
  role: "admin" | "collaborator";
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Apenas administradores podem gerenciar usuários.");
}

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([
    (await import("@/integrations/supabase/auth-middleware")).requireSupabaseAuth,
  ])
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

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([
    (await import("@/integrations/supabase/auth-middleware")).requireSupabaseAuth,
  ])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o próprio acesso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
