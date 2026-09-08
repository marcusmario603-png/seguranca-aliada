-- Helper: active staff check (no SECURITY DEFINER needed; user_roles/profiles readable by self)
-- Beneficiaries: require active staff AND visible parent process
DROP POLICY IF EXISTS beneficiaries_select ON public.beneficiaries;
DROP POLICY IF EXISTS beneficiaries_insert ON public.beneficiaries;
DROP POLICY IF EXISTS beneficiaries_update ON public.beneficiaries;
DROP POLICY IF EXISTS beneficiaries_delete ON public.beneficiaries;

CREATE POLICY beneficiaries_select ON public.beneficiaries FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = beneficiaries.process_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

CREATE POLICY beneficiaries_insert ON public.beneficiaries FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = beneficiaries.process_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

CREATE POLICY beneficiaries_update ON public.beneficiaries FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = beneficiaries.process_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active))
WITH CHECK (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = beneficiaries.process_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

CREATE POLICY beneficiaries_delete ON public.beneficiaries FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = beneficiaries.process_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

-- Documents: require active staff
DROP POLICY IF EXISTS documents_select ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;

CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = documents.client_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = documents.client_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

-- Process history: require active staff
DROP POLICY IF EXISTS history_select ON public.process_history;
DROP POLICY IF EXISTS history_insert ON public.process_history;

CREATE POLICY history_select ON public.process_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_history.process_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

CREATE POLICY history_insert ON public.process_history FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_history.process_id)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

-- Storage: documents bucket read requires active staff and a registered document row
DROP POLICY IF EXISTS docs_read_auth ON storage.objects;
CREATE POLICY docs_read_auth ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents'
  AND EXISTS (SELECT 1 FROM public.documents d JOIN public.clients c ON c.id = d.client_id
              WHERE d.storage_path = storage.objects.name)
  AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
              WHERE ur.user_id = auth.uid() AND pr.active));

-- Profiles: hide staff PII columns from the Data API; only names/positions remain readable
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, position, active, created_at, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;