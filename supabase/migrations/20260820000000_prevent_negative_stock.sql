-- Impede que uma venda deixe o estoque negativo, mesmo se o app for
-- contornado (chamada direta à API, ferramenta de IA, etc.). A tela de
-- Vendas já valida isso antes de enviar, mas o banco é a garantia final.
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

REVOKE EXECUTE ON FUNCTION public.apply_sale_stock() FROM PUBLIC, anon, authenticated;
