-- =============================================
-- MIGRATION 018: Fix capturar_pagamento — IDs text
-- =============================================
-- Causa do bug: função declarava variáveis uuid mas colunas id/venda_id
-- em vendas/agendamentos são `text` (uid() do frontend gera hex).
-- Erro: "operator does not exist: text = uuid" ao comparar WHERE id = v_venda_id.
--
-- Fix: usar `text` pros ids e castar `auth.uid()` com ::text onde necessário.
-- Funciona tanto se colunas são text quanto uuid (Postgres faz cast implícito).

CREATE OR REPLACE FUNCTION public.capturar_pagamento(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_id_text text;
  v_venda_id text;
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
  v_agendamento_id text;
  v_lancar_financeiro boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  v_user_id_text := v_user_id::text;

  v_valor := (p_payload->>'valor')::numeric(10,2);
  v_forma := p_payload->>'forma_pagamento';
  v_parcelas := COALESCE((p_payload->>'parcelas')::int, 1);
  v_data := COALESCE((p_payload->>'data_pagamento')::timestamptz, now());
  v_obs := COALESCE(p_payload->>'observacoes', '');
  v_lancar_financeiro := COALESCE((p_payload->>'lancar_financeiro')::boolean, true);
  v_agendamento_id := NULLIF(p_payload->>'agendamento_id', '');

  -- Validações
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;
  IF v_forma IS NULL OR v_forma NOT IN ('debito','credito','pix','dinheiro','boleto','transferencia') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;

  -- Determinar venda_id: usar existente ou criar nova
  v_venda_id := NULLIF(p_payload->>'venda_id', '');

  IF v_venda_id IS NULL THEN
    -- Criar venda a partir dos dados do payload (vindo de agendamento)
    v_venda_id := COALESCE(p_payload->>'new_venda_id', gen_random_uuid()::text);

    INSERT INTO public.vendas (
      id, user_id, cliente_id, nome_cliente, descricao, valor, desconto,
      valor_total, forma_pagamento, data_venda, status, status_pagamento,
      valor_pago, parcelas, funcionario, observacoes, created_at
    ) VALUES (
      v_venda_id,
      v_user_id,
      NULLIF(p_payload->>'cliente_id', ''),
      COALESCE(p_payload->>'nome_cliente', ''),
      COALESCE(p_payload->>'descricao', ''),
      COALESCE((p_payload->>'valor_venda')::numeric, v_valor),
      COALESCE((p_payload->>'desconto')::numeric, 0),
      COALESCE((p_payload->>'valor_total')::numeric, v_valor),
      NULL,
      now(),
      'aberta',
      'pendente',
      0,
      v_parcelas,
      COALESCE(p_payload->>'funcionario', ''),
      COALESCE(p_payload->>'obs_venda', ''),
      now()
    );

    -- Vincular agendamento à nova venda
    IF v_agendamento_id IS NOT NULL THEN
      UPDATE public.agendamentos
        SET venda_id = v_venda_id
        WHERE id::text = v_agendamento_id
          AND user_id::text = v_user_id_text;
    END IF;
  END IF;

  -- Verificar que a venda pertence ao usuário
  SELECT COALESCE(valor_total, valor, 0) INTO v_valor_total
    FROM public.vendas
    WHERE id::text = v_venda_id
      AND user_id::text = v_user_id_text;

  IF v_valor_total IS NULL THEN
    RAISE EXCEPTION 'Venda não encontrada ou não pertence ao usuário';
  END IF;

  -- Criar entrada no financeiro (se solicitado)
  IF v_lancar_financeiro THEN
    v_descricao_fin := COALESCE(
      'Pagamento - ' || (
        SELECT nome_cliente FROM public.vendas
          WHERE id::text = v_venda_id
          LIMIT 1
      ),
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
  -- pagamentos.venda_id é uuid; v_venda_id é text → cast obrigatório
  INSERT INTO public.pagamentos (
    id, user_id, venda_id, valor, forma_pagamento, parcelas,
    data_pagamento, observacoes, financeiro_id, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_venda_id::uuid,
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
    WHERE venda_id::text = v_venda_id;

  UPDATE public.vendas
    SET valor_pago = v_total_pago,
        status_pagamento = CASE
          WHEN v_total_pago = 0 THEN 'pendente'
          WHEN v_total_pago < COALESCE(valor_total, valor, 0) THEN 'parcial'
          ELSE 'pago'
        END
    WHERE id::text = v_venda_id
      AND status_pagamento NOT IN ('cortesia', 'cancelada');

  RETURN jsonb_build_object(
    'venda_id', v_venda_id,
    'pagamento_id', v_pagamento_id,
    'financeiro_id', v_financeiro_id,
    'valor_pago', v_total_pago,
    'status_pagamento', (
      SELECT status_pagamento FROM public.vendas
        WHERE id::text = v_venda_id LIMIT 1
    )
  );
END;
$$;

-- Também corrige funções relacionadas que podem ter o mesmo bug:
CREATE OR REPLACE FUNCTION public.excluir_pagamento(p_pagamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_id_text text;
  v_venda_id text;
  v_financeiro_id uuid;
  v_total_pago numeric(10,2);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  v_user_id_text := v_user_id::text;

  SELECT venda_id::text, financeiro_id INTO v_venda_id, v_financeiro_id
    FROM public.pagamentos
    WHERE id = p_pagamento_id AND user_id = v_user_id;

  IF v_venda_id IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  IF v_financeiro_id IS NOT NULL THEN
    DELETE FROM public.financeiro
      WHERE id = v_financeiro_id AND user_id = v_user_id;
  END IF;

  DELETE FROM public.pagamentos
    WHERE id = p_pagamento_id AND user_id = v_user_id;

  SELECT COALESCE(SUM(valor), 0) INTO v_total_pago
    FROM public.pagamentos
    WHERE venda_id::text = v_venda_id;

  UPDATE public.vendas
    SET valor_pago = v_total_pago,
        status_pagamento = CASE
          WHEN v_total_pago = 0 THEN 'pendente'
          WHEN v_total_pago < COALESCE(valor_total, valor, 0) THEN 'parcial'
          ELSE 'pago'
        END
    WHERE id::text = v_venda_id
      AND user_id::text = v_user_id_text
      AND status_pagamento NOT IN ('cortesia', 'cancelada');

  RETURN jsonb_build_object(
    'venda_id', v_venda_id,
    'valor_pago', v_total_pago,
    'status_pagamento', (
      SELECT status_pagamento FROM public.vendas
        WHERE id::text = v_venda_id LIMIT 1
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_cortesia(p_venda_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_id_text text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  v_user_id_text := v_user_id::text;

  DELETE FROM public.financeiro
    WHERE id IN (
      SELECT financeiro_id FROM public.pagamentos
        WHERE venda_id::text = p_venda_id AND user_id = v_user_id AND financeiro_id IS NOT NULL
    ) AND user_id = v_user_id;

  DELETE FROM public.pagamentos
    WHERE venda_id::text = p_venda_id AND user_id = v_user_id;

  UPDATE public.vendas
    SET status_pagamento = 'cortesia',
        valor_pago = 0
    WHERE id::text = p_venda_id AND user_id::text = v_user_id_text;

  RETURN jsonb_build_object('venda_id', p_venda_id, 'status_pagamento', 'cortesia');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_venda(p_venda_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_id_text text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  v_user_id_text := v_user_id::text;

  DELETE FROM public.financeiro
    WHERE id IN (
      SELECT financeiro_id FROM public.pagamentos
        WHERE venda_id::text = p_venda_id AND user_id = v_user_id AND financeiro_id IS NOT NULL
    ) AND user_id = v_user_id;

  DELETE FROM public.pagamentos
    WHERE venda_id::text = p_venda_id AND user_id = v_user_id;

  UPDATE public.vendas
    SET status_pagamento = 'cancelada',
        valor_pago = 0
    WHERE id::text = p_venda_id AND user_id::text = v_user_id_text;

  UPDATE public.agendamentos
    SET venda_id = NULL
    WHERE venda_id::text = p_venda_id AND user_id::text = v_user_id_text;

  RETURN jsonb_build_object('venda_id', p_venda_id, 'status_pagamento', 'cancelada');
END;
$$;
