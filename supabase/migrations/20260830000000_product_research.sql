-- Mineração de produto: onde você anota o que está testando/pesquisando
-- antes de decidir investir de verdade (vira um produto real quando
-- aprovado). Não mexe nas tabelas de produtos/compras/vendas existentes.
CREATE TABLE public.product_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  source text,
  estimated_cost numeric(12,2) NOT NULL DEFAULT 0,
  estimated_price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'testando'
    CHECK (status IN ('testando', 'aprovado', 'reprovado')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_research TO authenticated;
GRANT ALL ON public.product_research TO service_role;

ALTER TABLE public.product_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own product_research" ON public.product_research FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_product_research_user ON public.product_research(user_id);
