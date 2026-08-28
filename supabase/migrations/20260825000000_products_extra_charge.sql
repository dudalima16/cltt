-- Cobrança extra por unidade (ex.: taxa de entrega que você cobra do
-- cliente), somada ao preço de venda pra margem/lucro ficarem certos.
ALTER TABLE public.products
  ADD COLUMN extra_charge numeric(12,2) NOT NULL DEFAULT 0;
