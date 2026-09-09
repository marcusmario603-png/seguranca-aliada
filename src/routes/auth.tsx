import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { friendlyError } from "@/lib/crm";
import logoAsset from "@/assets/logo-garantia-protecao.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso ao CRM | Garantia e Proteção" },
      { name: "description", content: "Área restrita aos colaboradores da Garantia e Proteção Seguros." },
      { property: "og:title", content: "Acesso ao CRM | Garantia e Proteção" },
      { property: "og:description", content: "Área restrita aos colaboradores da Garantia e Proteção Seguros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { toast.error(friendlyError(error, "Não foi possível entrar.")); return; }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function recover() {
    if (!email.trim()) { toast.error("Informe seu e-mail para recuperar a senha."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error("Não foi possível enviar o e-mail de recuperação."); return; }
    toast.success("Enviamos um link de recuperação para seu e-mail.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={logoAsset.url}
            alt="Garantia e Proteção"
            className="h-28 w-auto rounded-xl bg-white object-contain p-2 shadow-lg"
          />
          <h1 className="mt-3 text-xl font-semibold text-sidebar-foreground">Acesso ao CRM</h1>
          <p className="text-sm text-sidebar-foreground/70">CRM interno · Plano de Saúde</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Use suas credenciais corporativas. Novos acessos são criados pelo administrador.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Entrar
              </Button>
              <button type="button" onClick={recover} className="w-full text-sm text-primary hover:underline">
                Esqueci minha senha
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
