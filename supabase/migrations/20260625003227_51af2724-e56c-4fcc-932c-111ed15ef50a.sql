-- Garantir unicidade da chave em site_settings (necessário para upsert/seed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_key_unique'
  ) THEN
    ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_key_unique UNIQUE (key);
  END IF;
END $$;

-- Semear configurações padrão (não sobrescreve valores existentes)
INSERT INTO public.site_settings (key, value) VALUES
  ('site_title', '{"texto":"Seu Sorteio | Campanhas"}'::jsonb),
  ('campaign_name', '{"nome":"20.000,00 no seu PIX!"}'::jsonb),
  ('prize_banner', '{"texto":"SÃO 20 MIL REAIS DIRETO NO SEU PIX!"}'::jsonb),
  ('total_cotas', '{"quantidade":999999}'::jsonb),
  ('quantity_options', '[{"qty":50,"popular":false},{"qty":250,"popular":true},{"qty":500,"popular":false},{"qty":1000,"popular":false}]'::jsonb),
  ('banner_images', '[]'::jsonb),
  ('campanhas_anteriores', '[]'::jsonb),
  ('regulamento', '{"texto":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Políticas de Storage para o bucket campaign-images
-- Leitura pública (qualquer visitante pode ver as imagens da campanha)
CREATE POLICY "campaign-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-images');

-- Upload/alteração/exclusão apenas para usuários autenticados (admin logado)
CREATE POLICY "campaign-images authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-images');

CREATE POLICY "campaign-images authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-images')
  WITH CHECK (bucket_id = 'campaign-images');

CREATE POLICY "campaign-images authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-images');