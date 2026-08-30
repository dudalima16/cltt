-- Desconto dado na venda (R$), pra analisar quais produtos só saem com
-- desconto na hora de decidir o que vale reinvestir.
ALTER TABLE public.sales
  ADD COLUMN discount numeric(12,2) NOT NULL DEFAULT 0;
