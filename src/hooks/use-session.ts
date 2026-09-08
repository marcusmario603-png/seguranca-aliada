import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SessionInfo = {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export function useSession() {
  return useQuery<SessionInfo | null>({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return {
        userId: user.id,
        email: user.email || "",
        name: profile?.name || user.email?.split("@")[0] || "Usuário",
        isAdmin: (roles || []).some((r) => r.role === "admin"),
      };
    },
    staleTime: 60_000,
  });
}
