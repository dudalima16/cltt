-- "Outros custos" por unidade: gasolina, taxa de entrega e afins, além do
-- preço de custo do produto em si. Entra na margem/lucro junto com o custo.
ALTER TABLE public.products
  ADD COLUMN extra_cost numeric(12,2) NOT NULL DEFAULT 0;
