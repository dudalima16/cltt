-- Taxas de marketplace salvas pelo usuário (nomeadas, editáveis, reusáveis
-- na Mineração), além das referências fixas do app.
CREATE TABLE public.marketplace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  fee_pct numeric(6,2) NOT NULL DEFAULT 0,
  fixed_fee numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_profiles TO authenticated;
GRANT ALL ON public.marketplace_profiles TO service_role;
ALTER TABLE public.marketplace_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own marketplace_profiles" ON public.marketplace_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_marketplace_profiles_user ON public.marketplace_profiles(user_id);

-- Lista livre de outros custos por produto testado (mão de obra, gasolina,
-- embalagem, o que for) — guardada como [{ "label": "...", "value": 0 }].
ALTER TABLE public.product_research
  ADD COLUMN extra_costs jsonb NOT NULL DEFAULT '[]'::jsonb;
