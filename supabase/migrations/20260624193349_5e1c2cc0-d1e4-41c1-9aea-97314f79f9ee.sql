REVOKE EXECUTE ON FUNCTION public.generate_unique_quotas(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_unique_quotas(int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_quotas(int) TO service_role;