-- =============================================
-- ENTREGA 1 — Infraestrutura Superadmin
-- Funções SECURITY DEFINER para painel admin
-- =============================================

-- 1) Função: verifica se uid é superadmin
-- Na entrega 2, será migrada para consultar tabela `superadmins`.
CREATE OR REPLACE FUNCTION public.admin_is_superadmin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lista hardcoded por enquanto (igual SUPER_ADMIN_IDS no front)
  RETURN uid IN ('22cf7ac8-0e64-481e-b0a6-c71b8fc11823');
END;
$$;

-- 2) Função RPC: listar contas com filtros, busca e paginação
CREATE OR REPLACE FUNCTION public.admin_listar_contas(
  p_filtro text DEFAULT 'todos',
  p_busca text DEFAULT '',
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 50,
  p_ordem text DEFAULT 'cadastro_desc'
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

  WITH contas AS (
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
      END AS status,
      COALESCE(bc.nome_empresa, '') AS nome_empresa,
      COALESCE(bc.slogan, '') AS slogan,
      COALESCE(bc.cor_primaria, '#cff004') AS cor_primaria,
      COALESCE(cnt_cli.total, 0) AS total_clientes,
      COALESCE(cnt_ven.total, 0) AS total_vendas,
      COALESCE(cnt_age.total, 0) AS total_agendamentos
    FROM auth.users u
    LEFT JOIN brand_config bc ON bc.user_id = u.id
    LEFT JOIN LATERAL (SELECT count(*)::int AS total FROM clientes WHERE clientes.user_id = u.id) cnt_cli ON true
    LEFT JOIN LATERAL (SELECT count(*)::int AS total FROM vendas WHERE vendas.user_id = u.id) cnt_ven ON true
    LEFT JOIN LATERAL (SELECT count(*)::int AS total FROM agendamentos WHERE agendamentos.user_id = u.id) cnt_age ON true
    WHERE
      -- Filtro de busca
      (p_busca = '' OR u.email ILIKE '%' || p_busca || '%' OR COALESCE(bc.nome_empresa, '') ILIKE '%' || p_busca || '%')
  ),
  contadores AS (
    SELECT
      count(*) FILTER (WHERE true) AS total,
      count(*) FILTER (WHERE status = 'ativa') AS ativas,
      count(*) FILTER (WHERE status = 'dormente') AS dormentes,
      count(*) FILTER (WHERE status = 'inativa') AS inativas,
      count(*) FILTER (WHERE status = 'nunca_logou') AS nunca_logou,
      count(*) FILTER (WHERE status = 'suspensa') AS suspensas
    FROM contas
  ),
  filtradas AS (
    SELECT * FROM contas
    WHERE
      p_filtro = 'todos'
      OR (p_filtro = 'ativa' AND status = 'ativa')
      OR (p_filtro = 'dormente' AND status = 'dormente')
      OR (p_filtro = 'inativa' AND status = 'inativa')
      OR (p_filtro = 'nunca_logou' AND status = 'nunca_logou')
      OR (p_filtro = 'suspensa' AND status = 'suspensa')
  ),
  ordenadas AS (
    SELECT * FROM filtradas
    ORDER BY
      CASE WHEN p_ordem = 'cadastro_desc' THEN cadastro END DESC NULLS LAST,
      CASE WHEN p_ordem = 'cadastro_asc' THEN cadastro END ASC NULLS LAST,
      CASE WHEN p_ordem = 'acesso_desc' THEN ultimo_acesso END DESC NULLS LAST,
      CASE WHEN p_ordem = 'acesso_asc' THEN ultimo_acesso END ASC NULLS LAST
    LIMIT p_limit OFFSET p_offset
  )
  SELECT json_build_object(
    'contas', COALESCE((SELECT json_agg(row_to_json(o)) FROM ordenadas o), '[]'::json),
    'contadores', (SELECT row_to_json(c) FROM contadores c),
    'total_filtrado', (SELECT count(*) FROM filtradas)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3) Função RPC: gerar support_code para um tenant (superadmin entra como suporte)
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

  -- Gerar código aleatório de 8 caracteres
  v_code := upper(substr(md5(random()::text), 1, 8));

  -- Buscar dados do target
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_target_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT COALESCE(bc.nome_empresa, v_email) INTO v_nome
  FROM brand_config bc WHERE bc.user_id = p_target_user_id;
  IF v_nome IS NULL THEN v_nome := v_email; END IF;

  -- Inserir na tabela support_codes
  INSERT INTO support_codes (user_id, code, user_email, user_nome, used)
  VALUES (p_target_user_id, v_code, v_email, v_nome, false);

  RETURN json_build_object('code', v_code, 'email', v_email, 'nome', v_nome);
END;
$$;

-- 4) Função RPC: métricas gerais do dashboard superadmin
CREATE OR REPLACE FUNCTION public.admin_metricas_gerais()
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

  WITH
  -- Contagem geral de contas
  contas_base AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE last_sign_in_at > now() - interval '30 days') AS ativas_30d,
      count(*) FILTER (WHERE last_sign_in_at > now() - interval '7 days') AS ativas_7d,
      count(*) FILTER (WHERE last_sign_in_at > now() - interval '1 day') AS ativas_1d,
      count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS novas_mes,
      count(*) FILTER (WHERE created_at >= date_trunc('month', now() - interval '1 month') AND created_at < date_trunc('month', now())) AS novas_mes_anterior
    FROM auth.users
  ),
  -- Churn: contas ativas mês passado que ficaram inativas (>30d sem login)
  churn AS (
    SELECT count(*) AS total
    FROM auth.users
    WHERE last_sign_in_at BETWEEN (now() - interval '60 days') AND (now() - interval '30 days')
      AND (last_sign_in_at IS NULL OR last_sign_in_at < now() - interval '30 days')
  ),
  -- Cadastros por dia (últimos 30d)
  cadastros_dia AS (
    SELECT
      d::date AS dia,
      count(u.id) AS total
    FROM generate_series(now() - interval '29 days', now(), interval '1 day') d
    LEFT JOIN auth.users u ON u.created_at::date = d::date
    GROUP BY d::date
    ORDER BY d::date
  ),
  -- Uso por módulo (contas com >=1 registro nos últimos 30d)
  uso_modulos AS (
    SELECT json_build_object(
      'vendas', (SELECT count(DISTINCT user_id) FROM vendas WHERE created_at > now() - interval '30 days'),
      'agendamentos', (SELECT count(DISTINCT user_id) FROM agendamentos WHERE created_at > now() - interval '30 days'),
      'clientes', (SELECT count(DISTINCT user_id) FROM clientes WHERE created_at > now() - interval '30 days'),
      'servicos', (SELECT count(DISTINCT user_id) FROM servicos WHERE created_at > now() - interval '30 days'),
      'financeiro', (SELECT count(DISTINCT user_id) FROM financeiro WHERE created_at > now() - interval '30 days'),
      'kanban_items', (SELECT count(DISTINCT user_id) FROM kanban_items WHERE created_at > now() - interval '30 days')
    ) AS dados
  ),
  -- Top 10 contas mais ativas do mês (soma de vendas + agendamentos + financeiro)
  top10 AS (
    SELECT
      u.id,
      u.email,
      COALESCE(bc.nome_empresa, u.email) AS nome,
      (COALESCE(v.cnt, 0) + COALESCE(a.cnt, 0) + COALESCE(f.cnt, 0)) AS atividade
    FROM auth.users u
    LEFT JOIN brand_config bc ON bc.user_id = u.id
    LEFT JOIN LATERAL (SELECT count(*)::int AS cnt FROM vendas WHERE vendas.user_id = u.id AND vendas.created_at >= date_trunc('month', now())) v ON true
    LEFT JOIN LATERAL (SELECT count(*)::int AS cnt FROM agendamentos WHERE agendamentos.user_id = u.id AND agendamentos.created_at >= date_trunc('month', now())) a ON true
    LEFT JOIN LATERAL (SELECT count(*)::int AS cnt FROM financeiro WHERE financeiro.user_id = u.id AND financeiro.created_at >= date_trunc('month', now())) f ON true
    ORDER BY atividade DESC
    LIMIT 10
  ),
  -- Contas em risco: ativas mês retrasado (>5 registros) mas <2 no mês atual
  em_risco AS (
    SELECT
      u.id,
      u.email,
      COALESCE(bc.nome_empresa, u.email) AS nome,
      COALESCE(prev.cnt, 0) AS atividade_anterior,
      COALESCE(curr.cnt, 0) AS atividade_atual
    FROM auth.users u
    LEFT JOIN brand_config bc ON bc.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT (
        (SELECT count(*) FROM vendas WHERE vendas.user_id = u.id AND vendas.created_at BETWEEN (now() - interval '60 days') AND (now() - interval '30 days')) +
        (SELECT count(*) FROM agendamentos WHERE agendamentos.user_id = u.id AND agendamentos.created_at BETWEEN (now() - interval '60 days') AND (now() - interval '30 days')) +
        (SELECT count(*) FROM financeiro WHERE financeiro.user_id = u.id AND financeiro.created_at BETWEEN (now() - interval '60 days') AND (now() - interval '30 days'))
      )::int AS cnt
    ) prev ON true
    LEFT JOIN LATERAL (
      SELECT (
        (SELECT count(*) FROM vendas WHERE vendas.user_id = u.id AND vendas.created_at >= date_trunc('month', now())) +
        (SELECT count(*) FROM agendamentos WHERE agendamentos.user_id = u.id AND agendamentos.created_at >= date_trunc('month', now())) +
        (SELECT count(*) FROM financeiro WHERE financeiro.user_id = u.id AND financeiro.created_at >= date_trunc('month', now()))
      )::int AS cnt
    ) curr ON true
    WHERE COALESCE(prev.cnt, 0) > 5 AND COALESCE(curr.cnt, 0) < 2
    LIMIT 10
  )
  SELECT json_build_object(
    'total_contas', (SELECT total FROM contas_base),
    'ativas_30d', (SELECT ativas_30d FROM contas_base),
    'ativas_7d', (SELECT ativas_7d FROM contas_base),
    'ativas_1d', (SELECT ativas_1d FROM contas_base),
    'novas_mes', (SELECT novas_mes FROM contas_base),
    'novas_mes_anterior', (SELECT novas_mes_anterior FROM contas_base),
    'churn', (SELECT total FROM churn),
    'cadastros_dia', COALESCE((SELECT json_agg(json_build_object('dia', dia, 'total', total) ORDER BY dia) FROM cadastros_dia), '[]'::json),
    'uso_modulos', (SELECT dados FROM uso_modulos),
    'top10', COALESCE((SELECT json_agg(json_build_object('id', id, 'email', email, 'nome', nome, 'atividade', atividade)) FROM top10), '[]'::json),
    'em_risco', COALESCE((SELECT json_agg(json_build_object('id', id, 'email', email, 'nome', nome, 'atividade_anterior', atividade_anterior, 'atividade_atual', atividade_atual)) FROM em_risco), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
