
DROP POLICY IF EXISTS roles_select ON public.user_roles;
CREATE POLICY roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

CREATE POLICY profiles_insert_admin ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY profiles_update_self_or_admin ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, position, active, created_at, updated_at) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
DROP POLICY IF EXISTS clients_delete_admin ON public.clients;

CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                 WHERE ur.user_id = auth.uid() AND pr.active));
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                WHERE ur.user_id = auth.uid() AND pr.active));
CREATE POLICY clients_update ON public.clients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                 WHERE ur.user_id = auth.uid() AND pr.active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                      WHERE ur.user_id = auth.uid() AND pr.active));
CREATE POLICY clients_delete_admin ON public.clients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS processes_select ON public.processes;
DROP POLICY IF EXISTS processes_insert ON public.processes;
DROP POLICY IF EXISTS processes_update ON public.processes;
DROP POLICY IF EXISTS processes_delete_admin ON public.processes;

CREATE POLICY processes_select ON public.processes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                 WHERE ur.user_id = auth.uid() AND pr.active));
CREATE POLICY processes_insert ON public.processes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                      WHERE ur.user_id = auth.uid() AND pr.active));
CREATE POLICY processes_update ON public.processes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                 WHERE ur.user_id = auth.uid() AND pr.active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles pr ON pr.id = ur.user_id
                      WHERE ur.user_id = auth.uid() AND pr.active));
CREATE POLICY processes_delete_admin ON public.processes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS beneficiaries_all ON public.beneficiaries;
CREATE POLICY beneficiaries_select ON public.beneficiaries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id));
CREATE POLICY beneficiaries_insert ON public.beneficiaries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id));
CREATE POLICY beneficiaries_update ON public.beneficiaries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id));
CREATE POLICY beneficiaries_delete ON public.beneficiaries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id));

DROP POLICY IF EXISTS history_select ON public.process_history;
DROP POLICY IF EXISTS history_insert ON public.process_history;
CREATE POLICY history_select ON public.process_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id));
CREATE POLICY history_insert ON public.process_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id));

DROP POLICY IF EXISTS documents_select ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;
DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id));
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id));
CREATE POLICY documents_delete ON public.documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid()
         OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS operators_select ON public.operators;
DROP POLICY IF EXISTS operators_write_admin ON public.operators;
CREATE POLICY operators_select ON public.operators FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY operators_write_admin ON public.operators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS docs_read_auth ON storage.objects;
CREATE POLICY docs_read_auth ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.clients c ON c.id = d.client_id
      WHERE d.storage_path = storage.objects.name
    )
  );

DROP POLICY IF EXISTS docs_delete_auth ON storage.objects;
CREATE POLICY docs_delete_auth ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (owner = auth.uid()
         OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  );

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_status_rules() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
