-- DMTech — Tipo de Atendimento (Agendado | Emergencial)
-- 2026-05-15 · pedido Josimar/Eletroseg
-- Justifica preço majorado no recibo quando atendimento foi emergencial

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS tipo_atendimento TEXT NOT NULL DEFAULT 'agendado'
  CHECK (tipo_atendimento IN ('agendado','emergencial'));

ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS tipo_atendimento TEXT NOT NULL DEFAULT 'agendado'
  CHECK (tipo_atendimento IN ('agendado','emergencial'));

COMMENT ON COLUMN public.ordens_servico.tipo_atendimento IS 'agendado | emergencial — justifica preço majorado no recibo';
COMMENT ON COLUMN public.orcamentos.tipo_atendimento IS 'agendado | emergencial — herdado pela OS quando convertido';
