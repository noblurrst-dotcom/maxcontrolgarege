-- ============================================================
-- 016 – Fotos do veículo (4 lados) + KM no checklist
-- ============================================================

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS foto_frente   TEXT,
  ADD COLUMN IF NOT EXISTS foto_traseira TEXT,
  ADD COLUMN IF NOT EXISTS foto_direita  TEXT,
  ADD COLUMN IF NOT EXISTS foto_esquerda TEXT,
  ADD COLUMN IF NOT EXISTS km_veiculo    INTEGER;
