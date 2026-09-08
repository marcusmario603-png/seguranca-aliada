ALTER TABLE public.processes DROP CONSTRAINT processes_responsible_user_id_fkey;
ALTER TABLE public.processes
  ADD CONSTRAINT processes_responsible_user_id_fkey
  FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.documents DROP CONSTRAINT documents_uploaded_by_fkey;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.process_history DROP CONSTRAINT process_history_user_id_fkey;
ALTER TABLE public.process_history
  ADD CONSTRAINT process_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;