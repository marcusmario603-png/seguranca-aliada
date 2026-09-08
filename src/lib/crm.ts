export type ProcessStatus =
  | "lead"
  | "qualified"
  | "proposal_sent"
  | "proposal_refused"
  | "cancelled"
  | "proposal_signed"
  | "active_contract";

export const STATUS_LABEL: Record<ProcessStatus, string> = {
  lead: "Lead",
  qualified: "Qualificado",
  proposal_sent: "Proposta enviada",
  proposal_refused: "Proposta recusada",
  cancelled: "Cancelado",
  proposal_signed: "Proposta assinada",
  active_contract: "Contrato vigente",
};

export const PIPELINE_STAGES: ProcessStatus[] = [
  "lead",
  "qualified",
  "proposal_sent",
  "proposal_signed",
  "active_contract",
];

export const CLOSED_STAGES: ProcessStatus[] = ["proposal_refused", "cancelled"];

export const ALL_STATUSES: ProcessStatus[] = [...PIPELINE_STAGES, ...CLOSED_STAGES];

export const STATUS_CLASS: Record<ProcessStatus, string> = {
  lead: "bg-secondary text-secondary-foreground",
  qualified: "bg-primary/10 text-primary",
  proposal_sent: "bg-accent/15 text-accent",
  proposal_signed: "bg-success/15 text-success",
  active_contract: "bg-success text-success-foreground",
  proposal_refused: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export const PLAN_TYPES = ["Individual", "Familiar", "Empresarial", "Coletivo por adesão"];
export const COVERAGES = ["Nacional", "Regional", "Grupo de municípios"];
export const ACCOMMODATIONS = ["Enfermaria", "Apartamento"];
export const NETWORK_TYPES = ["Própria", "Credenciada", "Mista"];
export const SEGMENTS = [
  "Ambulatorial",
  "Hospitalar",
  "Obstetrícia",
  "Ambulatorial + Hospitalar",
  "Hospitalar + Obstetrícia",
  "Completa",
];
export const RELATIONSHIPS = ["Titular", "Cônjuge", "Filho(a)", "Dependente", "Outro"];
export const DOC_TYPES = [
  "RG",
  "CPF",
  "CNH",
  "Cartão CNPJ",
  "Comprovante de residência",
  "Contrato",
  "Proposta",
  "Documento de beneficiário",
  "Outros",
];

export function clientName(c: {
  client_type: string;
  full_name?: string | null;
  company_name?: string | null;
  trade_name?: string | null;
}) {
  return c.client_type === "pf" ? c.full_name || "—" : c.trade_name || c.company_name || "—";
}

export function clientDoc(c: { client_type: string; cpf?: string | null; cnpj?: string | null }) {
  return (c.client_type === "pf" ? c.cpf : c.cnpj) || "—";
}

export function friendlyError(error: unknown, fallback: string) {
  const msg = (error as { message?: string })?.message || "";
  if (msg.includes("clients_cpf_key")) return "Este CPF já está cadastrado.";
  if (msg.includes("clients_cnpj_key")) return "Este CNPJ já está cadastrado.";
  if (msg.includes("operators_name_key")) return "Já existe uma operadora com esse nome.";
  if (msg.toLowerCase().includes("row-level security")) return "Você não tem permissão para esta ação.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha inválidos.";
  return fallback;
}

export type ClientLite = {
  id: string;
  client_type: string;
  full_name?: string | null;
  company_name?: string | null;
  trade_name?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  phone?: string | null;
};

export type ProcessRow = {
  id: string;
  code: number;
  status: ProcessStatus;
  plan_type: string;
  lives_quantity: number;
  client_id: string;
  operator_id: string | null;
  responsible_user_id: string | null;
  coverage: string | null;
  accommodation: string | null;
  network_type: string | null;
  assistance_segment: string | null;
  coparticipation: boolean;
  reimbursement: boolean;
  proposal_date: string | null;
  signed_date: string | null;
  effective_date: string | null;
  cancelled_date: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients: ClientLite;
  operators: { id: string; name: string } | null;
  profiles: { id: string; name: string } | null;
};
