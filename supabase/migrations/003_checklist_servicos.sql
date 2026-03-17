-- =============================================
-- MIGRAÇÃO: Serviços dentro do checklist (N:N)
-- Execute este SQL no Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS checklist_servicos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (checklist_id, servico_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_servicos_checklist_id ON checklist_servicos(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_servicos_servico_id ON checklist_servicos(servico_id);

ALTER TABLE checklist_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver serviços dos seus checklists"
  ON checklist_servicos FOR SELECT
  USING (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem criar serviços nos seus checklists"
  ON checklist_servicos FOR INSERT
  WITH CHECK (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem excluir serviços dos seus checklists"
  ON checklist_servicos FOR DELETE
  USING (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));
