-- ============================================================
-- MIGRAÇÃO: Criar tabelas para sincronização cross-device
-- Execute este SQL no painel do Supabase: SQL Editor > New Query
-- ============================================================

-- 1. Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id TEXT,
  nome_cliente TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL DEFAULT 'pix',
  descricao TEXT NOT NULL DEFAULT '',
  data_venda TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'aberta',
  parcelas INT NOT NULL DEFAULT 1,
  funcionario TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Pré-Vendas
CREATE TABLE IF NOT EXISTS pre_vendas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id TEXT,
  nome_cliente TEXT NOT NULL DEFAULT '',
  telefone_cliente TEXT NOT NULL DEFAULT '',
  itens JSONB NOT NULL DEFAULT '[]',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  validade TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id TEXT,
  venda_id TEXT,
  nome_cliente TEXT NOT NULL DEFAULT '',
  telefone_cliente TEXT NOT NULL DEFAULT '',
  servico TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL DEFAULT '',
  data_hora TEXT NOT NULL DEFAULT '',
  data_hora_fim TEXT NOT NULL DEFAULT '',
  duracao_min INT NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT NOT NULL DEFAULT '',
  desconto NUMERIC NOT NULL DEFAULT 0,
  valor NUMERIC NOT NULL DEFAULT 0,
  cor TEXT DEFAULT '#4285F4',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cpf_cnpj TEXT NOT NULL DEFAULT '',
  veiculo TEXT NOT NULL DEFAULT '',
  placa TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  aniversario TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  total_gasto NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Financeiro (Contas Financeiras)
CREATE TABLE IF NOT EXISTS financeiro (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'entrada',
  categoria TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '',
  pago BOOLEAN NOT NULL DEFAULT true,
  conta_bancaria TEXT NOT NULL DEFAULT '',
  forma_pagamento TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Contas Bancárias
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  banco TEXT NOT NULL DEFAULT '',
  saldo NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'corrente',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Kanban Items
CREATE TABLE IF NOT EXISTS kanban_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL DEFAULT 'orcamento',
  nome_cliente TEXT NOT NULL DEFAULT '',
  telefone_cliente TEXT NOT NULL DEFAULT '',
  placa TEXT NOT NULL DEFAULT '',
  veiculo TEXT NOT NULL DEFAULT '',
  servico TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT NOT NULL DEFAULT '',
  origem_tipo TEXT NOT NULL DEFAULT 'manual',
  origem_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Brand Config (1 row per user)
CREATE TABLE IF NOT EXISTS brand_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_usuario TEXT NOT NULL DEFAULT '',
  nome_empresa TEXT NOT NULL DEFAULT 'Estética Automotiva',
  slogan TEXT NOT NULL DEFAULT '',
  cnpj TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  cor_primaria TEXT NOT NULL DEFAULT '#CFFF04',
  cor_secundaria TEXT NOT NULL DEFAULT '#0d0d1a',
  cor_texto TEXT NOT NULL DEFAULT '#1a1a2e',
  pdf_rodape TEXT NOT NULL DEFAULT 'Obrigado pela preferência!',
  pdf_termos TEXT NOT NULL DEFAULT 'Orçamento válido por 15 dias. Valores sujeitos a alteração.',
  pdf_mostrar_logo BOOLEAN NOT NULL DEFAULT true,
  pdf_mostrar_dados BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Sub-Usuários
CREATE TABLE IF NOT EXISTS sub_usuarios (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  senha TEXT NOT NULL DEFAULT '',
  cargo TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  role TEXT NOT NULL DEFAULT 'operador',
  permissoes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Dashboard Blocks (preferences per user)
CREATE TABLE IF NOT EXISTS dashboard_blocks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blocks JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuário só vê/edita seus próprios dados
-- ============================================================

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_blocks ENABLE ROW LEVEL SECURITY;

-- Policies para todas as tabelas com user_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['vendas','pre_vendas','agendamentos','clientes','financeiro','contas_bancarias','kanban_items'])
  LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', tbl || '_policy', tbl);
  END LOOP;
END $$;

-- Sub-usuários: filtrar por owner_id
CREATE POLICY sub_usuarios_policy ON sub_usuarios FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Brand config e dashboard blocks: filtrar pela PK user_id
CREATE POLICY brand_config_policy ON brand_config FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY dashboard_blocks_policy ON dashboard_blocks FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 11. Super Admins (bypass RLS para visualização de suporte)
-- ============================================================
CREATE TABLE IF NOT EXISTS super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode checar se é super admin
CREATE POLICY super_admins_select ON super_admins FOR SELECT USING (true);

-- Inserir o(s) super admin(s) — substitua pelo UUID real
INSERT INTO super_admins (user_id) VALUES ('22cf7ac8-0e64-481e-b0a6-c71b8fc11823') ON CONFLICT DO NOTHING;

-- Políticas de leitura para super admin em todas as tabelas de dados
-- (super admin só pode LER dados de outros usuários, nunca escrever)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['vendas','pre_vendas','agendamentos','clientes','financeiro','contas_bancarias','kanban_items'])
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()))',
      tbl || '_superadmin_read', tbl
    );
  END LOOP;
END $$;

CREATE POLICY brand_config_superadmin_read ON brand_config FOR SELECT
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

CREATE POLICY sub_usuarios_superadmin_read ON sub_usuarios FOR SELECT
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

-- ============================================================
-- 12. Códigos de Suporte (para acesso remoto do admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS support_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL DEFAULT '',
  user_nome TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  used BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE support_codes ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode criar e ler seus próprios códigos
CREATE POLICY support_codes_own ON support_codes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Super admin pode ler qualquer código (necessário service_role key ou policy separada)
-- Para o admin, usamos uma policy que permite SELECT em códigos válidos (não expirados)
-- O admin valida o código e depois usa service_role para acessar dados do usuário
CREATE POLICY support_codes_read_valid ON support_codes
  FOR SELECT USING (
    expires_at > now() AND used = false
  );
