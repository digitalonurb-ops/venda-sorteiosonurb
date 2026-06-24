
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT TO public
  USING (true);

CREATE POLICY "Service role can manage site settings"
  ON public.site_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('progress_bar', '{"ativa": false, "porcentagem": 50}'::jsonb),
  ('banner', '{"ativa": false, "texto": "Adquira Já!", "cor": "#facc15", "cor_texto": "#000000"}'::jsonb);
