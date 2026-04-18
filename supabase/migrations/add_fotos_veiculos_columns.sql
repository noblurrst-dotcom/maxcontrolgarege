-- Adicionar colunas de fotos do veículo na tabela clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS foto_frente   TEXT,
  ADD COLUMN IF NOT EXISTS foto_traseira TEXT,
  ADD COLUMN IF NOT EXISTS foto_direita  TEXT,
  ADD COLUMN IF NOT EXISTS foto_esquerda TEXT;
