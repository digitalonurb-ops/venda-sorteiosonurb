-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  celular TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  valor TEXT NOT NULL,
  txid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Quotas table
CREATE TABLE public.quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT quotas_numero_unique UNIQUE (numero)
);
GRANT ALL ON public.quotas TO service_role;
ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_quotas_order_id ON public.quotas(order_id);
CREATE INDEX idx_orders_txid ON public.orders(txid);

-- Prize quotas table
CREATE TABLE public.prize_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  premio_valor NUMERIC NOT NULL DEFAULT 0,
  premio_descricao TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel',
  vendida BOOLEAN NOT NULL DEFAULT false,
  pode_vender BOOLEAN NOT NULL DEFAULT true,
  ativa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prize_quotas TO anon, authenticated;
GRANT ALL ON public.prize_quotas TO service_role;
ALTER TABLE public.prize_quotas ENABLE ROW LEVEL SECURITY;

-- Promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT false,
  timer_minutos INTEGER DEFAULT NULL,
  cotas_dobro BOOLEAN NOT NULL DEFAULT false,
  ativado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- ═══ ORDERS policies ═══
CREATE POLICY "Service role can insert orders"
  ON public.orders FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can select orders"
  ON public.orders FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can update orders"
  ON public.orders FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can delete orders"
  ON public.orders FOR DELETE TO service_role USING (true);

-- ═══ QUOTAS policies ═══
CREATE POLICY "Service role can manage quotas"
  ON public.quotas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══ PRIZE_QUOTAS policies ═══
CREATE POLICY "Anyone can view active prize quotas"
  ON public.prize_quotas FOR SELECT TO public USING (ativa = true);
CREATE POLICY "Service role can manage prize quotas"
  ON public.prize_quotas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══ PROMOTIONS policies ═══
CREATE POLICY "Anyone can view active promotions"
  ON public.promotions FOR SELECT TO public USING (ativa = true);
CREATE POLICY "Service role can manage promotions"
  ON public.promotions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══ SITE_SETTINGS ═══
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT TO public USING (true);
CREATE POLICY "Service role can manage site settings"
  ON public.site_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.site_settings (key, value) VALUES
  ('progress_bar', '{"ativa": false, "porcentagem": 50}'::jsonb),
  ('banner', '{"ativa": false, "texto": "Adquira Já!", "cor": "#facc15", "cor_texto": "#000000"}'::jsonb);

-- ═══ Unique quota generator ═══
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
  CREATE TEMP TABLE IF NOT EXISTS _cotas_geradas (num text PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _cotas_geradas;

  WHILE tentativas < max_tentativas LOOP
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