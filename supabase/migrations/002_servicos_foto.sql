-- =============================================
-- MIGRAÇÃO: Adicionar foto_url na tabela servicos
-- Execute este SQL no Supabase SQL Editor
-- =============================================

ALTER TABLE servicos ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT NULL;

-- Criar bucket para fotos de serviços (se ainda não existir)
-- Vá em Storage > New bucket > nome: "servicos-fotos" > marque "Public bucket"
