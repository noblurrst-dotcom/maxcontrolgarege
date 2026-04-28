-- ============================================================
-- 014 – Add checklist_id FK to vendas table
-- ============================================================

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS checklist_id UUID REFERENCES public.checklists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_checklist_id ON public.vendas(checklist_id);
