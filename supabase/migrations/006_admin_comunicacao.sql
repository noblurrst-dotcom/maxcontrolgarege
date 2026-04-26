-- =============================================
-- ENTREGA 3 — Comunicação
-- Banners globais + Mensagens diretas
-- =============================================

-- 1) Tabela de banners globais
CREATE TABLE IF NOT EXISTS public.admin_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'aviso', 'critico')),
  ativo boolean NOT NULL DEFAULT true,
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_banners ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_banners_ativo ON public.admin_banners (ativo, created_at DESC);

-- 2) Tabela de mensagens diretas (superadmin → tenant)
CREATE TABLE IF NOT EXISTS public.admin_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assunto text NOT NULL,
  corpo text NOT NULL DEFAULT '',
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_mensagens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mensagens_target ON public.admin_mensagens (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_created ON public.admin_mensagens (created_at DESC);

-- ======= RPCs de Banners =======

-- 3) Criar banner
CREATE OR REPLACE FUNCTION public.admin_criar_banner(
  p_titulo text,
  p_mensagem text DEFAULT '',
  p_tipo text DEFAULT 'info',
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO admin_banners (titulo, mensagem, tipo, admin_id, expires_at)
  VALUES (p_titulo, p_mensagem, p_tipo, auth.uid(), p_expires_at)
  RETURNING id INTO v_id;

  INSERT INTO admin_audit_log (admin_id, acao, detalhes)
  VALUES (auth.uid(), 'criar_banner', json_build_object('banner_id', v_id, 'titulo', p_titulo, 'tipo', p_tipo)::jsonb);

  RETURN json_build_object('id', v_id);
END;
$$;

-- 4) Listar banners (admin)
CREATE OR REPLACE FUNCTION public.admin_listar_banners()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(row_to_json(b) ORDER BY b.created_at DESC)
     FROM admin_banners b),
    '[]'::json
  );
END;
$$;

-- 5) Toggle banner ativo/inativo
CREATE OR REPLACE FUNCTION public.admin_toggle_banner(p_id uuid, p_ativo boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE admin_banners SET ativo = p_ativo WHERE id = p_id;

  INSERT INTO admin_audit_log (admin_id, acao, detalhes)
  VALUES (auth.uid(), 'toggle_banner', json_build_object('banner_id', p_id, 'ativo', p_ativo)::jsonb);

  RETURN json_build_object('ok', true);
END;
$$;

-- 6) Buscar banner ativo (público para qualquer usuário logado)
CREATE OR REPLACE FUNCTION public.get_banner_ativo()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT row_to_json(b)
    FROM admin_banners b
    WHERE b.ativo = true
      AND (b.expires_at IS NULL OR b.expires_at > now())
    ORDER BY
      CASE b.tipo WHEN 'critico' THEN 0 WHEN 'aviso' THEN 1 ELSE 2 END,
      b.created_at DESC
    LIMIT 1
  );
END;
$$;

-- ======= RPCs de Mensagens =======

-- 7) Enviar mensagem (superadmin → tenant)
CREATE OR REPLACE FUNCTION public.admin_enviar_mensagem(
  p_target_user_id uuid,
  p_assunto text,
  p_corpo text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO admin_mensagens (admin_id, target_user_id, assunto, corpo)
  VALUES (auth.uid(), p_target_user_id, p_assunto, p_corpo)
  RETURNING id INTO v_id;

  INSERT INTO admin_audit_log (admin_id, acao, target_user_id, detalhes)
  VALUES (auth.uid(), 'enviar_mensagem', p_target_user_id, json_build_object('mensagem_id', v_id, 'assunto', p_assunto)::jsonb);

  RETURN json_build_object('id', v_id);
END;
$$;

-- 8) Listar mensagens de uma conta (admin)
CREATE OR REPLACE FUNCTION public.admin_listar_mensagens_conta(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(row_to_json(m) ORDER BY m.created_at DESC)
     FROM admin_mensagens m
     WHERE m.target_user_id = p_user_id),
    '[]'::json
  );
END;
$$;

-- 9) Listar mensagens recentes (admin - todas as contas)
CREATE OR REPLACE FUNCTION public.admin_listar_mensagens_recentes(
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT admin_is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(sub)
     FROM (
       SELECT
         m.id, m.assunto, m.corpo, m.lida, m.created_at,
         (SELECT email FROM auth.users WHERE id = m.target_user_id) AS target_email,
         (SELECT COALESCE(bc.nome_empresa, '') FROM brand_config bc WHERE bc.user_id = m.target_user_id LIMIT 1) AS target_nome,
         m.target_user_id
       FROM admin_mensagens m
       ORDER BY m.created_at DESC
       LIMIT p_limit OFFSET p_offset
     ) sub),
    '[]'::json
  );
END;
$$;

-- 10) Buscar minhas mensagens (tenant)
CREATE OR REPLACE FUNCTION public.get_minhas_mensagens()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT json_agg(row_to_json(m) ORDER BY m.created_at DESC)
     FROM admin_mensagens m
     WHERE m.target_user_id = auth.uid()),
    '[]'::json
  );
END;
$$;

-- 11) Marcar mensagem como lida (tenant)
CREATE OR REPLACE FUNCTION public.marcar_mensagem_lida(p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_mensagens SET lida = true
  WHERE id = p_id AND target_user_id = auth.uid();

  RETURN json_build_object('ok', true);
END;
$$;
