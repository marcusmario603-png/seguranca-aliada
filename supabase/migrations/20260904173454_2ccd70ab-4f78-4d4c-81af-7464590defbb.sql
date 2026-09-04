
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','collaborator');
CREATE TYPE public.process_status AS ENUM ('lead','qualified','proposal_sent','proposal_refused','cancelled','proposal_signed','active_contract');
CREATE TYPE public.client_type AS ENUM ('pf','pj');

-- UPDATED AT
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  cpf TEXT,
  email TEXT,
  phone TEXT,
  position TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email);
  SELECT COUNT(*) = 0 INTO is_first FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'collaborator'::public.app_role END);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_type public.client_type NOT NULL,
  full_name TEXT,
  company_name TEXT,
  trade_name TEXT,
  cpf TEXT UNIQUE,
  cnpj TEXT UNIQUE,
  birth_date DATE,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  zip_code TEXT,
  state TEXT,
  city TEXT,
  neighborhood TEXT,
  address TEXT,
  number TEXT,
  complement TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clients_pf_requires_cpf CHECK (client_type <> 'pf' OR (full_name IS NOT NULL AND cpf IS NOT NULL)),
  CONSTRAINT clients_pj_requires_cnpj CHECK (client_type <> 'pj' OR (company_name IS NOT NULL AND cnpj IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clients_delete_admin" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_clients_cpf ON public.clients(cpf);
CREATE INDEX idx_clients_cnpj ON public.clients(cnpj);
CREATE INDEX idx_clients_full_name ON public.clients(full_name);
CREATE INDEX idx_clients_company_name ON public.clients(company_name);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_deleted_at ON public.clients(deleted_at);

-- OPERATORS
CREATE TABLE public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO authenticated;
GRANT ALL ON public.operators TO service_role;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operators_select" ON public.operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "operators_write_admin" ON public.operators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER operators_updated BEFORE UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.operators (name) VALUES
  ('Bradesco Saúde'),('Amil Saúde'),('Central Nacional Unimed — CNU'),('Sul América Saúde'),('Hapvida');

-- PROCESSES
CREATE TABLE public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code SERIAL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL DEFAULT 'Individual',
  status public.process_status NOT NULL DEFAULT 'lead',
  coverage TEXT,
  accommodation TEXT,
  coparticipation BOOLEAN NOT NULL DEFAULT false,
  network_type TEXT,
  reimbursement BOOLEAN NOT NULL DEFAULT false,
  assistance_segment TEXT,
  lives_quantity INTEGER NOT NULL DEFAULT 1,
  proposal_date DATE,
  signed_date DATE,
  effective_date DATE,
  cancelled_date DATE,
  cancellation_reason TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processes TO authenticated;
GRANT ALL ON public.processes TO service_role;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "processes_select" ON public.processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "processes_insert" ON public.processes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "processes_update" ON public.processes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "processes_delete_admin" ON public.processes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER processes_updated BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_processes_status ON public.processes(status);
CREATE INDEX idx_processes_client ON public.processes(client_id);
CREATE INDEX idx_processes_operator ON public.processes(operator_id);
CREATE INDEX idx_processes_responsible ON public.processes(responsible_user_id);

-- BENEFICIARIES
CREATE TABLE public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  relationship TEXT NOT NULL DEFAULT 'Titular',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiaries TO authenticated;
GRANT ALL ON public.beneficiaries TO service_role;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beneficiaries_all" ON public.beneficiaries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER beneficiaries_updated BEFORE UPDATE ON public.beneficiaries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_beneficiaries_process ON public.beneficiaries(process_id);

-- DOCUMENTS
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'Outros',
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_documents_client ON public.documents(client_id);
CREATE INDEX idx_documents_process ON public.documents(process_id);

-- PROCESS HISTORY
CREATE TABLE public.process_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_status public.process_status,
  new_status public.process_status,
  action TEXT NOT NULL DEFAULT 'status_change',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.process_history TO authenticated;
GRANT ALL ON public.process_history TO service_role;
ALTER TABLE public.process_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_select" ON public.process_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert" ON public.process_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_history_process ON public.process_history(process_id);

-- AUTO HISTORY + BUSINESS RULES
CREATE OR REPLACE FUNCTION public.process_status_rules() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.process_history (process_id, user_id, previous_status, new_status, action)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status, 'created');
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'active_contract' AND NEW.effective_date IS NULL THEN
      NEW.effective_date := CURRENT_DATE;
    END IF;
    IF NEW.status = 'proposal_sent' AND NEW.proposal_date IS NULL THEN
      NEW.proposal_date := CURRENT_DATE;
    END IF;
    IF NEW.status = 'proposal_signed' AND NEW.signed_date IS NULL THEN
      NEW.signed_date := CURRENT_DATE;
    END IF;
    IF NEW.status = 'cancelled' AND NEW.cancelled_date IS NULL THEN
      NEW.cancelled_date := CURRENT_DATE;
    END IF;
    INSERT INTO public.process_history (process_id, user_id, previous_status, new_status, action, notes)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, 'status_change', NEW.cancellation_reason);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER processes_status_insert AFTER INSERT ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.process_status_rules();
CREATE TRIGGER processes_status_update BEFORE UPDATE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.process_status_rules();
