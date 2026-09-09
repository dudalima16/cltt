-- Campos pra simular o lucro líquido de um produto em teste: taxa de
-- marketplace (% + fixa), imposto (% — útil se sair do MEI pro Simples) e
-- gasto com ADS por unidade. Tudo com padrão 0 e editável.
ALTER TABLE public.product_research
  ADD COLUMN marketplace_fee_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN marketplace_fixed_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN tax_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN ads_cost numeric(12,2) NOT NULL DEFAULT 0;
