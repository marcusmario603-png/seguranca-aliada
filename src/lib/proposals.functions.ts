import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExtractedDependent = {
  name: string;
  cpf?: string | null;
  birth_date?: string | null;
  relationship?: string | null;
};

export type ExtractedProposal = {
  client_type: "pf" | "pj";
  full_name?: string | null;
  company_name?: string | null;
  trade_name?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  birth_date?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  zip_code?: string | null;
  state?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  operator_name?: string | null;
  plan_type?: string | null;
  dependents: ExtractedDependent[];
};

const SYSTEM = `Você extrai dados de propostas de planos de saúde brasileiras (Amil, Bradesco Saúde, SulAmérica, Unimed, Hapvida/NotreDame, Porto Seguro, Omint, Care Plus e outras).
Cada operadora usa um layout diferente: procure blocos como "Dados do Titular", "Proponente", "Beneficiário Titular", "Contratante", "Dependentes", "Beneficiários", "Grupo Familiar".
Regras:
- Responda SOMENTE com JSON válido, sem markdown.
- Datas no formato AAAA-MM-DD.
- CPF/CNPJ com máscara brasileira (000.000.000-00 / 00.000.000/0000-00).
- Telefone no formato (00) 00000-0000.
- Use null quando o dado não estiver claramente no documento; nunca invente.
- client_type = "pj" apenas quando houver CNPJ/razão social como contratante; caso contrário "pf".
- dependents: apenas pessoas diferentes do titular; relationship em português (Cônjuge, Filho(a), Dependente).
Formato: {"client_type":"pf|pj","full_name":null,"company_name":null,"trade_name":null,"cpf":null,"cnpj":null,"birth_date":null,"email":null,"phone":null,"whatsapp":null,"zip_code":null,"state":null,"city":null,"neighborhood":null,"address":null,"number":null,"complement":null,"operator_name":null,"plan_type":null,"dependents":[{"name":"","cpf":null,"birth_date":null,"relationship":null}]}`;

export const extractProposalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { text: string; operators?: string[] }) => {
    const text = (data?.text || "").trim();
    if (text.length < 40) throw new Error("pdf_sem_texto");
    return { text: text.slice(0, 60000), operators: data.operators ?? [] };
  })
  .handler(async ({ data }): Promise<ExtractedProposal> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("ia_indisponivel");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Operadoras cadastradas no CRM: ${data.operators.join(", ") || "não informadas"}.\n\nTexto da proposta:\n${data.text}`,
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("limite_ia");
    if (res.status === 402) throw new Error("creditos_ia");
    if (!res.ok) throw new Error("falha_ia");

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("falha_leitura");

    const parsed = JSON.parse(match[0]) as Partial<ExtractedProposal>;
    return {
      ...parsed,
      client_type: parsed.client_type === "pj" ? "pj" : "pf",
      dependents: Array.isArray(parsed.dependents)
        ? parsed.dependents.filter((d) => d && typeof d.name === "string" && d.name.trim().length > 1)
        : [],
    } as ExtractedProposal;
  });
