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
