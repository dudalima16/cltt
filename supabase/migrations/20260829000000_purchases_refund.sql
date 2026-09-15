-- Prazo de reembolso por compra (normalmente 7 dias, mas editável) e status
-- manual pra saber o que já foi solicitado, reembolsado, ou o prazo perdido.
ALTER TABLE public.purchases
  ADD COLUMN refund_deadline date,
  ADD COLUMN refund_status text NOT NULL DEFAULT 'nao_solicitado'
    CHECK (refund_status IN ('nao_solicitado', 'solicitado', 'reembolsado'));

-- Preenche 7 dias de prazo pras compras que já existem, senão ficam sem
-- data nenhuma (o app usa isso como referência, editável a qualquer hora).
UPDATE public.purchases
SET refund_deadline = purchased_at + INTERVAL '7 days'
WHERE refund_deadline IS NULL;
