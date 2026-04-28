-- ============================================================
-- 015 – Checklist unificado
-- Cada defeito agora tem posição (x,y) no diagrama + descrição livre
-- Checklist guarda metadata extra para o PDF (pintura, lavador, datas etc)
-- ============================================================

-- 1) Defeitos com posição e descrição livre
ALTER TABLE public.checklist_itens
  ADD COLUMN IF NOT EXISTS pos_x NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS pos_y NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT '';

-- item_tipo passa a ser opcional (defeitos novos não precisam de tipo pré-definido)
ALTER TABLE public.checklist_itens
  ALTER COLUMN item_tipo DROP NOT NULL;

-- 2) Metadata do checklist usada no PDF
ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS estado_pintura TEXT
    CHECK (estado_pintura IS NULL OR estado_pintura IN ('otimo','bom','regular','ruim')),
  ADD COLUMN IF NOT EXISTS lavador TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tecnico_polidor TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_entrada_loja DATE,
  ADD COLUMN IF NOT EXISTS data_entrada_oficina DATE,
  ADD COLUMN IF NOT EXISTS data_saida_oficina DATE;
