-- =============================================
-- SCHEMA DO BANCO DE DADOS - ESTÉTICA AUTOMOTIVA
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: checklists
-- =============================================
CREATE TABLE IF NOT EXISTS checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placa VARCHAR(10) NOT NULL,
  nome_cliente VARCHAR(255) NOT NULL,
  telefone_cliente VARCHAR(20) DEFAULT '',
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  servico VARCHAR(255) DEFAULT 'Serviço geral',
  valor DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '180 days')
);

-- Índices para checklists
CREATE INDEX idx_checklists_user_id ON checklists(user_id);
CREATE INDEX idx_checklists_created_at ON checklists(created_at DESC);
CREATE INDEX idx_checklists_placa ON checklists(placa);

-- =============================================
-- TABELA: checklist_itens
-- =============================================
CREATE TABLE IF NOT EXISTS checklist_itens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item_tipo VARCHAR(100) NOT NULL,
  observacao TEXT DEFAULT '',
  tem_foto BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 0
);

-- Índice para checklist_itens
CREATE INDEX idx_checklist_itens_checklist_id ON checklist_itens(checklist_id);

-- =============================================
-- TABELA: fotos
-- =============================================
CREATE TABLE IF NOT EXISTS fotos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item_tipo VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 days')
);

-- Índice para fotos
CREATE INDEX idx_fotos_checklist_id ON fotos(checklist_id);

-- =============================================
-- TABELA: servicos
-- =============================================
CREATE TABLE IF NOT EXISTS servicos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT DEFAULT '',
  preco_padrao DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para servicos
CREATE INDEX idx_servicos_user_id ON servicos(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuário só vê seus próprios dados
-- =============================================

-- Checklists RLS
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios checklists"
  ON checklists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios checklists"
  ON checklists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios checklists"
  ON checklists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios checklists"
  ON checklists FOR DELETE
  USING (auth.uid() = user_id);

-- Checklist Itens RLS
ALTER TABLE checklist_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens dos seus checklists"
  ON checklist_itens FOR SELECT
  USING (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem criar itens nos seus checklists"
  ON checklist_itens FOR INSERT
  WITH CHECK (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar itens dos seus checklists"
  ON checklist_itens FOR UPDATE
  USING (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem excluir itens dos seus checklists"
  ON checklist_itens FOR DELETE
  USING (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

-- Fotos RLS
ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver fotos dos seus checklists"
  ON fotos FOR SELECT
  USING (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem criar fotos nos seus checklists"
  ON fotos FOR INSERT
  WITH CHECK (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem excluir fotos dos seus checklists"
  ON fotos FOR DELETE
  USING (checklist_id IN (SELECT id FROM checklists WHERE user_id = auth.uid()));

-- Servicos RLS
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios serviços"
  ON servicos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios serviços"
  ON servicos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios serviços"
  ON servicos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios serviços"
  ON servicos FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKET para fotos
-- =============================================
-- Execute no Supabase Dashboard > Storage:
-- 1. Criar bucket "fotos-checklist" (público)
-- 2. Configurar política de acesso:
--    - Authenticated users podem fazer upload na pasta do seu user_id
--    - Qualquer um pode ler (público)

-- =============================================
-- FUNÇÃO DE LIMPEZA AUTOMÁTICA
-- Executa periodicamente para limpar dados expirados
-- =============================================

-- Função para limpar checklists expirados (180 dias)
CREATE OR REPLACE FUNCTION limpar_checklists_expirados()
RETURNS void AS $$
BEGIN
  DELETE FROM checklists WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar fotos expiradas (15 dias)
CREATE OR REPLACE FUNCTION limpar_fotos_expiradas()
RETURNS void AS $$
BEGIN
  DELETE FROM fotos WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Para agendar a limpeza automática, configure um cron job no Supabase:
-- Vá em Database > Extensions > pg_cron (habilitar)
-- Depois execute:
-- SELECT cron.schedule('limpar-checklists', '0 3 * * *', 'SELECT limpar_checklists_expirados()');
-- SELECT cron.schedule('limpar-fotos', '0 3 * * *', 'SELECT limpar_fotos_expiradas()');
