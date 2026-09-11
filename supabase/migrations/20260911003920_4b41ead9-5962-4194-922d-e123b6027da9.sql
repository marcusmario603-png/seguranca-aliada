DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles pr ON pr.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND pr.active
  )
);

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, position, active, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (name, cpf, email, phone, position, active, updated_at) ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;