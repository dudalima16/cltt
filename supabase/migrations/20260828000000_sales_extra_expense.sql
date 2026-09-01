-- Gasto extra na hora da venda (entrega, gasolina...). Diferente do
-- "extra_cost" do produto (fixo por unidade) e do "discount" (só
-- informativo) — esse aqui é variável por venda e abate do lucro de verdade.
ALTER TABLE public.sales
  ADD COLUMN extra_expense numeric(12,2) NOT NULL DEFAULT 0;
