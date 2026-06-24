
-- ═══ ORDERS ═══
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view orders by txid" ON public.orders;
DROP POLICY IF EXISTS "Service role can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Allow INSERT only from service_role (edge functions create orders)
CREATE POLICY "Service role can insert orders"
  ON public.orders FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow SELECT only from service_role
CREATE POLICY "Service role can select orders"
  ON public.orders FOR SELECT
  TO service_role
  USING (true);

-- Allow UPDATE only from service_role
CREATE POLICY "Service role can update orders"
  ON public.orders FOR UPDATE
  TO service_role
  USING (true);

-- Allow DELETE only from service_role
CREATE POLICY "Service role can delete orders"
  ON public.orders FOR DELETE
  TO service_role
  USING (true);

-- ═══ PRIZE_QUOTAS ═══
DROP POLICY IF EXISTS "Anyone can view active prize quotas" ON public.prize_quotas;
DROP POLICY IF EXISTS "Service role can manage prize quotas" ON public.prize_quotas;

-- Public can view active prize quotas (read-only, non-sensitive data)
CREATE POLICY "Anyone can view active prize quotas"
  ON public.prize_quotas FOR SELECT
  TO public
  USING (ativa = true);

-- Service role manages everything
CREATE POLICY "Service role can manage prize quotas"
  ON public.prize_quotas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══ PROMOTIONS ═══
DROP POLICY IF EXISTS "Anyone can view active promotions" ON public.promotions;
DROP POLICY IF EXISTS "Service role can manage promotions" ON public.promotions;

-- Public can view active promotions only
CREATE POLICY "Anyone can view active promotions"
  ON public.promotions FOR SELECT
  TO public
  USING (ativa = true);

-- Service role manages everything
CREATE POLICY "Service role can manage promotions"
  ON public.promotions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══ QUOTAS ═══
DROP POLICY IF EXISTS "Anyone can view quotas" ON public.quotas;
DROP POLICY IF EXISTS "Service role can insert quotas" ON public.quotas;

-- Public can still view quotas (just numbers, non-sensitive)
CREATE POLICY "Anyone can view quotas"
  ON public.quotas FOR SELECT
  TO public
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage quotas"
  ON public.quotas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
