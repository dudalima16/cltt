-- Data de cadastro editável — às vezes o produto é cadastrado antes de
-- chegar, então o usuário quer poder ajustar essa data manualmente,
-- separada do created_at (que é o timestamp real de quando salvou no banco).
ALTER TABLE public.products
  ADD COLUMN registered_at date NOT NULL DEFAULT current_date;
