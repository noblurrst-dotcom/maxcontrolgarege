-- ============================================================
-- 017 – Adicionar data_agendamento e hora_agendamento em vendas
-- Esses campos são usados quando o usuário cria uma venda já
-- agendando o serviço. O ChecklistUnificado e adicionar() em
-- Vendas.tsx tentam gravar essas colunas; sem elas, o upsert
-- falha silenciosamente e a venda some.
-- ============================================================

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS data_agendamento DATE,
  ADD COLUMN IF NOT EXISTS hora_agendamento TEXT;
