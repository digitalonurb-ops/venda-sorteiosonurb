CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.generate_unique_quotas(quantidade int)
RETURNS TABLE(numero text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tentativas int := 0;
  max_tentativas int := 20;
  encontrados int := 0;
BEGIN
  -- Create temp table to accumulate results
  CREATE TEMP TABLE IF NOT EXISTS _cotas_geradas (num text PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _cotas_geradas;

  WHILE tentativas < max_tentativas LOOP
    -- Generate candidates, exclude already taken and blocked
    INSERT INTO _cotas_geradas (num)
    SELECT DISTINCT candidate FROM (
      SELECT lpad(floor(random() * 1000000)::int::text, 6, '0') AS candidate
      FROM generate_series(1, quantidade * 5)
    ) candidates
    WHERE candidate NOT IN (SELECT q.numero FROM quotas q)
      AND candidate NOT IN (SELECT pq.numero FROM prize_quotas pq WHERE pq.pode_vender = false)
    ON CONFLICT (num) DO NOTHING;

    SELECT COUNT(*) INTO encontrados FROM _cotas_geradas;

    IF encontrados >= quantidade THEN
      RETURN QUERY SELECT cg.num FROM _cotas_geradas cg LIMIT quantidade;
      RETURN;
    END IF;

    tentativas := tentativas + 1;
  END LOOP;

  RAISE EXCEPTION 'Não foi possível gerar % cotas únicas após % tentativas', quantidade, max_tentativas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_unique_quotas(int) TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_unique_quotas(int) FROM anon, authenticated;