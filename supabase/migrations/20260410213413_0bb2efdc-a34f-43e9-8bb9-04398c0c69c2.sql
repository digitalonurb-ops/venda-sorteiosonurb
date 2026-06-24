
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

ALTER TABLE public.prize_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prize quotas"
ON public.prize_quotas FOR SELECT
USING (true);

CREATE POLICY "Service role can manage prize quotas"
ON public.prize_quotas FOR ALL
USING (true)
WITH CHECK (true);

-- Promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotions"
ON public.promotions FOR SELECT
USING (true);

CREATE POLICY "Service role can manage promotions"
ON public.promotions FOR ALL
USING (true)
WITH CHECK (true);
