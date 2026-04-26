-- =============================================
-- ENTREGA 2 — Controle e Confiança
-- Tabela superadmins, audit log, RPCs de detalhe/suspensão
-- =============================================

-- 1) Tabela superadmins
CREATE TABLE IF NOT EXISTS public.superadmins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: superadmin atual
INSERT INTO public.superadmins (id) VALUES ('22cf7ac8-0e64-481e-b0a6-c71b8fc11823')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS (sem policies — acesso apenas via SECURITY DEFINER)
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

-- 2) Atualizar admin_is_superadmin para consultar tabela
CREATE OR REPLACE FUNCTION public.admin_is_superadmin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM superadmins WHERE id = uid);
END;
$$;

-- 3) Tabela audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  acao text NOT NULL,
  target_user_id uuid,
  detalhes jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log (target_user_id, created_at DESC);

-- 4) RPC: detalhe de uma conta
CREATE OR REPLACE FUNCTION public.admin_detalhe_conta(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Registrar no audit log
  INSERT INTO admin_audit_log (admin_id, acao, target_user_id)
  VALUES (auth.uid(), 'ver_detalhe_conta', p_user_id);

  WITH
  conta AS (
    SELECT
      u.id,
      u.email,
      u.created_at AS cadastro,
      u.last_sign_in_at AS ultimo_acesso,
      u.banned_until,
      CASE
        WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'suspensa'
        WHEN u.last_sign_in_at IS NULL THEN 'nunca_logou'
        WHEN u.last_sign_in_at > now() - interval '30 days' THEN 'ativa'
        WHEN u.last_sign_in_at > now() - interval '90 days' THEN 'dormente'
        ELSE 'inativa'
      END AS status
    FROM auth.users u
    WHERE u.id = p_user_id
  ),
  brand AS (
    SELECT
      nome_empresa, slogan, cor_primaria, cor_secundaria, logo_url, nome_usuario
    FROM brand_config
    WHERE user_id = p_user_id
    LIMIT 1
  ),
  contagens AS (
    SELECT
      (SELECT count(*)::int FROM clientes WHERE user_id = p_user_id) AS total_clientes,
      (SELECT count(*)::int FROM vendas WHERE user_id = p_user_id) AS total_vendas,
      (SELECT count(*)::int FROM agendamentos WHERE user_id = p_user_id) AS total_agendamentos,
      (SELECT count(*)::int FROM servicos WHERE user_id = p_user_id) AS total_servicos,
      (SELECT count(*)::int FROM financeiro WHERE user_id = p_user_id) AS total_financeiro
  ),
  ultimas_vendas AS (
    SELECT json_agg(sub ORDER BY sub.created_at DESC) AS dados
    FROM (
      SELECT id, descricao, valor_total, created_at
      FROM vendas
      WHERE user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT 10
    ) sub
  ),
  ultimos_agendamentos AS (
    SELECT json_agg(sub ORDER BY sub.data_hora DESC) AS dados
    FROM (
      SELECT id, nome_cliente, servico, data_hora, data_hora_fim
      FROM agendamentos
      WHERE user_id = p_user_id
      ORDER BY data_hora DESC
      LIMIT 10
    ) sub
  ),
  audit AS (
    SELECT json_agg(sub ORDER BY sub.created_at DESC) AS dados
    FROM (
      SELECT id, acao, detalhes, created_at,
        (SELECT email FROM auth.users WHERE auth.users.id = admin_audit_log.admin_id) AS admin_email
      FROM admin_audit_log
      WHERE target_user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT 10
    ) sub
  )
  SELECT json_build_object(
    'conta', (SELECT row_to_json(c) FROM conta c),
    'brand', (SELECT row_to_json(b) FROM brand b),
    'contagens', (SELECT row_to_json(cg) FROM contagens cg),
    'ultimas_vendas', COALESCE((SELECT dados FROM ultimas_vendas), '[]'::json),
    'ultimos_agendamentos', COALESCE((SELECT dados FROM ultimos_agendamentos), '[]'::json),
    'audit_log', COALESCE((SELECT dados FROM audit), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 5) RPC: suspender ou reativar conta
CREATE OR REPLACE FUNCTION public.admin_suspender_conta(p_user_id uuid, p_acao text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_acao = 'suspender' THEN
    UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = p_user_id;
    INSERT INTO admin_audit_log (admin_id, acao, target_user_id, detalhes)
    VALUES (auth.uid(), 'suspender_conta', p_user_id, '{"acao": "suspender"}'::jsonb);
  ELSIF p_acao = 'reativar' THEN
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
    INSERT INTO admin_audit_log (admin_id, acao, target_user_id, detalhes)
    VALUES (auth.uid(), 'reativar_conta', p_user_id, '{"acao": "reativar"}'::jsonb);
  ELSE
    RAISE EXCEPTION 'Ação inválida: %', p_acao;
  END IF;

  RETURN json_build_object('ok', true, 'acao', p_acao);
END;
$$;

-- 6) RPC: listar audit log
CREATE OR REPLACE FUNCTION public.admin_listar_audit_log(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH logs AS (
    SELECT
      al.id,
      al.acao,
      al.detalhes,
      al.created_at,
      (SELECT email FROM auth.users WHERE auth.users.id = al.admin_id) AS admin_email,
      (SELECT email FROM auth.users WHERE auth.users.id = al.target_user_id) AS target_email,
      al.target_user_id
    FROM admin_audit_log al
    ORDER BY al.created_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT json_build_object(
    'logs', COALESCE((SELECT json_agg(row_to_json(l)) FROM logs l), '[]'::json),
    'total', (SELECT count(*) FROM admin_audit_log)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 7) Atualizar admin_gerar_support_code para registrar no audit log
CREATE OR REPLACE FUNCTION public.admin_gerar_support_code(p_target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_email text;
  v_nome text;
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_code := upper(substr(md5(random()::text), 1, 8));

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_target_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT COALESCE(bc.nome_empresa, v_email) INTO v_nome
  FROM brand_config bc WHERE bc.user_id = p_target_user_id;
  IF v_nome IS NULL THEN v_nome := v_email; END IF;

  INSERT INTO support_codes (user_id, code, user_email, user_nome, used)
  VALUES (p_target_user_id, v_code, v_email, v_nome, false);

  -- Audit log
  INSERT INTO admin_audit_log (admin_id, acao, target_user_id, detalhes)
  VALUES (auth.uid(), 'gerar_support_code', p_target_user_id, json_build_object('code', v_code)::jsonb);

  RETURN json_build_object('code', v_code, 'email', v_email, 'nome', v_nome);
END;
$$;
