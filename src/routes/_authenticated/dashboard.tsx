import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, Briefcase, FileSignature, ShieldCheck } from "lucide-react";
import { useClients, useProcesses } from "@/hooks/use-crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_STATUSES, PIPELINE_STAGES, STATUS_LABEL, type ProcessStatus } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | CRM Garantia e Proteção" },
      { name: "description", content: "Indicadores de clientes, propostas e contratos de plano de saúde." },
      { property: "og:title", content: "Dashboard | CRM Garantia e Proteção" },
      { property: "og:description", content: "Indicadores de clientes, propostas e contratos de plano de saúde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: clients = [] } = useClients();
  const { data: processes = [] } = useProcesses();

  const counts = useMemo(() => {
    const map = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<ProcessStatus, number>;
    for (const p of processes) map[p.status as ProcessStatus]++;
    return map;
  }, [processes]);

  const byOperator = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of processes) {
      const name = (p as { operators?: { name?: string } }).operators?.name || "Sem operadora";
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [processes]);

  const maxOperator = Math.max(1, ...byOperator.map(([, n]) => n));
  const maxStage = Math.max(1, ...PIPELINE_STAGES.map((s) => counts[s]));

  const cards = [
    { label: "Clientes", value: clients.length, icon: Users, to: "/clientes" as const },
    { label: "Processos ativos", value: processes.length, icon: Briefcase, to: "/processos" as const },
    { label: "Propostas assinadas", value: counts.proposal_signed, icon: FileSignature, to: "/pipeline" as const },
    { label: "Contratos vigentes", value: counts.active_contract, icon: ShieldCheck, to: "/pipeline" as const },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da carteira de planos de saúde.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PIPELINE_STAGES.map((s) => (
              <div key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{STATUS_LABEL[s]}</span>
                  <span className="font-medium">{counts[s]}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(counts[s] / maxStage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                Recusados: <strong>{counts.proposal_refused}</strong>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                Cancelados: <strong>{counts.cancelled}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos por operadora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byOperator.length === 0 && <p className="text-sm text-muted-foreground">Nenhum processo cadastrado.</p>}
            {byOperator.map(([name, n]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium">{n}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${(n / maxOperator) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
