# CRM Garantia e Proteção

CRM interno da Garantia e Proteção Consultoria e Corretora de Seguros LTDA, focado na gestão comercial de planos de saúde.

## Acesso

- `/auth` — entrar, criar acesso e recuperar senha
- `/reset-password` — definir nova senha
- Todas as demais telas exigem login

O primeiro usuário cadastrado recebe perfil de administrador; os demais entram como colaboradores. Administradores podem ativar/desativar colegas e excluir cadastros.

## Telas

| Rota | Função |
| --- | --- |
| `/dashboard` | Indicadores da carteira, funil comercial e processos por operadora |
| `/clientes` | Lista, busca e filtros de clientes PF e PJ |
| `/clientes/:id` | Ficha completa: dados, processos, documentos e histórico |
| `/processos` | Lista de processos com filtros por situação, operadora, responsável e plano |
| `/processos/:id` | Detalhes do processo, beneficiários, documentos e histórico |
| `/pipeline` | Quadro Kanban por etapa do funil |
| `/documentos` | Todos os arquivos enviados, com busca |
| `/colaboradores` | Equipe com acesso ao sistema |
| `/configuracoes` | Cadastro e ativação de operadoras |

## Regras de negócio

- Etapas do funil: lead, qualificado, proposta enviada, proposta assinada, contrato vigente, recusado e cancelado.
- Datas de proposta, assinatura, vigência e cancelamento são preenchidas automaticamente na mudança de etapa.
- Cancelamento exige motivo.
- Toda criação e mudança de etapa gera registro de histórico com autor e data.
- Exclusão de cliente é lógica (soft delete) e restrita a administradores.
- CPF e CNPJ são validados e não podem se repetir.

## Dados e segurança

- Banco PostgreSQL com Row Level Security em todas as tabelas; leitura e escrita apenas para usuários autenticados, com ações sensíveis restritas a administradores.
- Papéis ficam em tabela própria (`user_roles`), nunca no perfil.
- Documentos ficam em armazenamento privado; o acesso é feito por links temporários assinados.

## Tecnologia

React + TypeScript, TanStack Start/Router, TanStack Query, Tailwind CSS, Radix UI, Lucide, React Hook Form + Zod, Sonner (avisos) e Lovable Cloud (banco, autenticação e arquivos).
