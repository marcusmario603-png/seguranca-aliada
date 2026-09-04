import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CRM Garantia e Proteção | Plano de Saúde" },
      {
        name: "description",
        content:
          "Sistema interno da Garantia e Proteção Consultoria e Corretora de Seguros para gestão de clientes, processos e documentos de plano de saúde.",
      },
      { property: "og:title", content: "CRM Garantia e Proteção | Plano de Saúde" },
      {
        property: "og:description",
        content: "Gestão interna de clientes, propostas, contratos e documentos de plano de saúde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
        <ShieldCheck className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-sidebar-foreground">CRM Garantia e Proteção</h1>
      <p className="mt-2 max-w-md text-sm text-sidebar-foreground/70">
        Gestão de clientes, propostas, contratos e documentos de plano de saúde.
      </p>
      <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
        Acessar o sistema <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </main>
  );
}
