-- Setup completo do banco "Gestão Sair do CLT" — rodar de uma vez só em um
-- projeto Supabase novo e vazio.

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  extra_cost numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  extra_charge numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  purchased_at date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  sold_at date NOT NULL DEFAULT current_date,
  channel text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own products" ON public.products FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own purchases" ON public.purchases FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sales" ON public.sales FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_products_user ON public.products(user_id);
CREATE INDEX idx_purchases_user_date ON public.purchases(user_id, purchased_at);
CREATE INDEX idx_sales_user_date ON public.sales(user_id, sold_at);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apply_purchase_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET stock = stock - OLD.quantity WHERE id = OLD.product_id;
  ELSE
    UPDATE public.products SET stock = stock - OLD.quantity WHERE id = OLD.product_id;
    UPDATE public.products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER purchases_stock AFTER INSERT OR UPDATE OR DELETE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.apply_purchase_stock();

-- Versão com trava de estoque negativo (impede vender mais do que existe).
CREATE OR REPLACE FUNCTION public.apply_sale_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_stock integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT stock INTO current_stock FROM public.products WHERE id = NEW.product_id FOR UPDATE;
    IF current_stock IS NULL THEN
      RAISE EXCEPTION 'Produto não encontrado.';
    END IF;
    IF current_stock - NEW.quantity < 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente: restam % unidade(s).', current_stock;
    END IF;
    UPDATE public.products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
  ELSE
    SELECT stock INTO current_stock FROM public.products WHERE id = NEW.product_id FOR UPDATE;
    IF current_stock IS NULL THEN
      RAISE EXCEPTION 'Produto não encontrado.';
    END IF;
    IF NEW.product_id = OLD.product_id THEN
      IF current_stock + OLD.quantity - NEW.quantity < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente: restam % unidade(s).', current_stock + OLD.quantity;
      END IF;
    ELSIF current_stock - NEW.quantity < 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente: restam % unidade(s).', current_stock;
    END IF;
    UPDATE public.products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
    UPDATE public.products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER sales_stock AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.apply_sale_stock();

REVOKE EXECUTE ON FUNCTION public.apply_purchase_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_sale_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
