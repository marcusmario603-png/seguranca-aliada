import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOperators() {
  return useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operators").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useClients(search = "") {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(
          `full_name.ilike.${s},company_name.ilike.${s},trade_name.ilike.${s},cpf.ilike.${s},cnpj.ilike.${s},email.ilike.${s},phone.ilike.${s}`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

const PROCESS_SELECT =
  "*, clients(id, client_type, full_name, company_name, trade_name, cpf, cnpj, phone), operators(id, name), profiles:responsible_user_id(id, name)";

export function useProcesses() {
  return useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select(PROCESS_SELECT)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
}

export function useProcess(id: string) {
  return useQuery({
    queryKey: ["process", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("processes").select(PROCESS_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
