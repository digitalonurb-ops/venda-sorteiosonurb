-- Remove overly permissive public SELECT on quotas
DROP POLICY IF EXISTS "Anyone can view quotas" ON public.quotas;

-- Only service_role needs access (via edge functions)
-- The "Service role can manage quotas" ALL policy already covers this.