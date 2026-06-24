
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

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view orders by txid"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Service role can update orders"
  ON public.orders FOR UPDATE
  USING (true);

-- Quotas table
CREATE TABLE public.quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT quotas_numero_unique UNIQUE (numero)
);

ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quotas"
  ON public.quotas FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert quotas"
  ON public.quotas FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_quotas_order_id ON public.quotas(order_id);
CREATE INDEX idx_orders_txid ON public.orders(txid);
