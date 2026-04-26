-- =============================================
-- MIGRATION 007: Pagamentos e Status de Pagamento
-- Suporte a múltiplos pagamentos por venda
-- =============================================

-- 1) Nova tabela: pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venda_id uuid NOT NULL,
  valor numeric(10,2) NOT NULL CHECK (valor > 0),
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN
    ('debito','credito','pix','dinheiro','boleto','transferencia')),
  parcelas int NOT NULL DEFAULT 1 CHECK (parcelas >= 1),
  data_pagamento timestamptz NOT NULL DEFAULT now(),
  observacoes text DEFAULT '',
  financeiro_id uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_id ON public.pagamentos(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON public.pagamentos(data_pagamento DESC);

-- RLS para pagamentos
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagamentos_select" ON public.pagamentos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pagamentos_insert" ON public.pagamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pagamentos_update" ON public.pagamentos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pagamentos_delete" ON public.pagamentos
  FOR DELETE USING (auth.uid() = user_id);

-- 2) Ajustes na tabela vendas
--    forma_pagamento passa a ser opcional
--    novos campos: status_pagamento, valor_pago
ALTER TABLE public.vendas
  ALTER COLUMN forma_pagamento DROP NOT NULL;

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS status_pagamento text
    DEFAULT 'pendente'
    CHECK (status_pagamento IN ('pendente','parcial','pago','cortesia','cancelada'));

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS valor_pago numeric(10,2) DEFAULT 0;

-- Backfill: vendas existentes já estavam quitadas → marcar como 'pago'
UPDATE public.vendas
  SET status_pagamento = 'pago',
      valor_pago = COALESCE(valor_total, valor, 0)
  WHERE status_pagamento IS NULL
     OR status_pagamento = 'pendente';

-- 3) RPC atômica: capturar_pagamento
--    Cria venda (se necessário) + pagamento + entrada no financeiro
--    em uma única transação.
CREATE OR REPLACE FUNCTION public.capturar_pagamento(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_venda_id uuid;
  v_pagamento_id uuid;
  v_financeiro_id uuid;
  v_valor numeric(10,2);
  v_forma text;
  v_parcelas int;
  v_data timestamptz;
  v_obs text;
  v_descricao_fin text;
  v_total_pago numeric(10,2);
  v_valor_total numeric(10,2);
  v_agendamento_id uuid;
  v_lancar_financeiro boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  v_valor := (p_payload->>'valor')::numeric(10,2);
  v_forma := p_payload->>'forma_pagamento';
  v_parcelas := COALESCE((p_payload->>'parcelas')::int, 1);
  v_data := COALESCE((p_payload->>'data_pagamento')::timestamptz, now());
  v_obs := COALESCE(p_payload->>'observacoes', '');
  v_lancar_financeiro := COALESCE((p_payload->>'lancar_financeiro')::boolean, true);
  v_agendamento_id := (p_payload->>'agendamento_id')::uuid;

  -- Validações
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;
  IF v_forma IS NULL OR v_forma NOT IN ('debito','credito','pix','dinheiro','boleto','transferencia') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;

  -- Determinar venda_id: usar existente ou criar nova
  v_venda_id := (p_payload->>'venda_id')::uuid;

  IF v_venda_id IS NULL THEN
    -- Criar venda a partir dos dados do payload (vindo de agendamento)
    INSERT INTO public.vendas (
      id, user_id, cliente_id, nome_cliente, descricao, valor, desconto,
      valor_total, forma_pagamento, data_venda, status, status_pagamento,
      valor_pago, parcelas, funcionario, observacoes, created_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      (p_payload->>'cliente_id')::uuid,
      COALESCE(p_payload->>'nome_cliente', ''),
      COALESCE(p_payload->>'descricao', ''),
      COALESCE((p_payload->>'valor_venda')::numeric, v_valor),
      COALESCE((p_payload->>'desconto')::numeric, 0),
      COALESCE((p_payload->>'valor_total')::numeric, v_valor),
      NULL, -- forma_pagamento legacy fica null
      now(),
      'aberta',
      'pendente',
      0,
      v_parcelas,
      COALESCE(p_payload->>'funcionario', ''),
      COALESCE(p_payload->>'obs_venda', ''),
      now()
    )
    RETURNING id INTO v_venda_id;

    -- Vincular agendamento à nova venda
    IF v_agendamento_id IS NOT NULL THEN
      UPDATE public.agendamentos
        SET venda_id = v_venda_id
        WHERE id = v_agendamento_id AND user_id = v_user_id;
    END IF;
  END IF;

  -- Verificar que a venda pertence ao usuário
  SELECT valor_total INTO v_valor_total
    FROM public.vendas
    WHERE id = v_venda_id AND user_id = v_user_id;

  IF v_valor_total IS NULL THEN
    RAISE EXCEPTION 'Venda não encontrada ou não pertence ao usuário';
  END IF;

  -- Criar entrada no financeiro (se solicitado)
  IF v_lancar_financeiro THEN
    v_descricao_fin := COALESCE(
      'Pagamento - ' || (SELECT nome_cliente FROM public.vendas WHERE id = v_venda_id),
      'Pagamento de venda'
    );

    INSERT INTO public.financeiro (
      id, user_id, tipo, categoria, descricao, valor, data, pago,
      conta_bancaria, forma_pagamento, created_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'entrada',
      'Venda',
      v_descricao_fin,
      v_valor,
      v_data::date::text,
      true,
      '',
      v_forma,
      now()
    )
    RETURNING id INTO v_financeiro_id;
  END IF;

  -- Criar pagamento
  INSERT INTO public.pagamentos (
    id, user_id, venda_id, valor, forma_pagamento, parcelas,
    data_pagamento, observacoes, financeiro_id, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_venda_id,
    v_valor,
    v_forma,
    v_parcelas,
    v_data,
    v_obs,
    v_financeiro_id,
    now()
  )
  RETURNING id INTO v_pagamento_id;

  -- Recalcular status_pagamento e valor_pago na venda
  SELECT COALESCE(SUM(valor), 0) INTO v_total_pago
    FROM public.pagamentos
    WHERE venda_id = v_venda_id;

  UPDATE public.vendas
    SET valor_pago = v_total_pago,
        status_pagamento = CASE
          WHEN v_total_pago = 0 THEN 'pendente'
          WHEN v_total_pago < valor_total THEN 'parcial'
          ELSE 'pago'
        END
    WHERE id = v_venda_id
      AND status_pagamento NOT IN ('cortesia', 'cancelada');

  RETURN jsonb_build_object(
    'venda_id', v_venda_id,
    'pagamento_id', v_pagamento_id,
    'financeiro_id', v_financeiro_id,
    'valor_pago', v_total_pago,
    'status_pagamento', (SELECT status_pagamento FROM public.vendas WHERE id = v_venda_id)
  );
END;
$$;

-- 4) RPC para excluir pagamento (com recálculo)
CREATE OR REPLACE FUNCTION public.excluir_pagamento(p_pagamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_venda_id uuid;
  v_financeiro_id uuid;
  v_total_pago numeric(10,2);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar dados do pagamento
  SELECT venda_id, financeiro_id INTO v_venda_id, v_financeiro_id
    FROM public.pagamentos
    WHERE id = p_pagamento_id AND user_id = v_user_id;

  IF v_venda_id IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  -- Excluir entrada do financeiro associada
  IF v_financeiro_id IS NOT NULL THEN
    DELETE FROM public.financeiro
      WHERE id = v_financeiro_id AND user_id = v_user_id;
  END IF;

  -- Excluir pagamento
  DELETE FROM public.pagamentos
    WHERE id = p_pagamento_id AND user_id = v_user_id;

  -- Recalcular
  SELECT COALESCE(SUM(valor), 0) INTO v_total_pago
    FROM public.pagamentos
    WHERE venda_id = v_venda_id;

  UPDATE public.vendas
    SET valor_pago = v_total_pago,
        status_pagamento = CASE
          WHEN v_total_pago = 0 THEN 'pendente'
          WHEN v_total_pago < valor_total THEN 'parcial'
          ELSE 'pago'
        END
    WHERE id = v_venda_id
      AND user_id = v_user_id
      AND status_pagamento NOT IN ('cortesia', 'cancelada');

  RETURN jsonb_build_object(
    'venda_id', v_venda_id,
    'valor_pago', v_total_pago,
    'status_pagamento', (SELECT status_pagamento FROM public.vendas WHERE id = v_venda_id)
  );
END;
$$;

-- 5) RPC para listar pagamentos de uma venda
CREATE OR REPLACE FUNCTION public.listar_pagamentos(p_venda_id uuid)
RETURNS SETOF public.pagamentos
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM public.pagamentos
    WHERE venda_id = p_venda_id
      AND user_id = auth.uid()
    ORDER BY data_pagamento DESC;
$$;

-- 6) RPC: marcar venda como cortesia
CREATE OR REPLACE FUNCTION public.marcar_cortesia(p_venda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Excluir pagamentos existentes e suas entradas no financeiro
  DELETE FROM public.financeiro
    WHERE id IN (
      SELECT financeiro_id FROM public.pagamentos
        WHERE venda_id = p_venda_id AND user_id = v_user_id AND financeiro_id IS NOT NULL
    ) AND user_id = v_user_id;

  DELETE FROM public.pagamentos
    WHERE venda_id = p_venda_id AND user_id = v_user_id;

  -- Marcar como cortesia
  UPDATE public.vendas
    SET status_pagamento = 'cortesia',
        valor_pago = 0
    WHERE id = p_venda_id AND user_id = v_user_id;

  RETURN jsonb_build_object('venda_id', p_venda_id, 'status_pagamento', 'cortesia');
END;
$$;

-- 7) RPC: cancelar venda com limpeza cascateada
CREATE OR REPLACE FUNCTION public.cancelar_venda(p_venda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Excluir entradas no financeiro dos pagamentos
  DELETE FROM public.financeiro
    WHERE id IN (
      SELECT financeiro_id FROM public.pagamentos
        WHERE venda_id = p_venda_id AND user_id = v_user_id AND financeiro_id IS NOT NULL
    ) AND user_id = v_user_id;

  -- Excluir pagamentos
  DELETE FROM public.pagamentos
    WHERE venda_id = p_venda_id AND user_id = v_user_id;

  -- Marcar venda como cancelada
  UPDATE public.vendas
    SET status_pagamento = 'cancelada',
        valor_pago = 0
    WHERE id = p_venda_id AND user_id = v_user_id;

  -- Desvincular agendamentos
  UPDATE public.agendamentos
    SET venda_id = NULL
    WHERE venda_id = p_venda_id AND user_id = v_user_id;

  RETURN jsonb_build_object('venda_id', p_venda_id, 'status_pagamento', 'cancelada');
END;
$$;
