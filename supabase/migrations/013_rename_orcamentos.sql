-- ============================================================
-- 013 – Criar tabela orcamentos (espelho de pre_vendas) + sync
-- Fase 1 do rename PreVenda → Orcamento
-- Fase 2 (futuro): drop trigger + drop pre_vendas
-- ============================================================

-- 1. Criar tabela orcamentos com mesma estrutura
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id TEXT,
  nome_cliente TEXT NOT NULL DEFAULT '',
  telefone_cliente TEXT DEFAULT '',
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','aprovado','recusado')),
  validade TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Copiar dados existentes
INSERT INTO public.orcamentos (id, user_id, cliente_id, nome_cliente, telefone_cliente, itens, valor_total, status, validade, observacoes, created_at)
SELECT id, user_id, cliente_id, nome_cliente, telefone_cliente, itens, valor_total, status, validade, observacoes, created_at
FROM public.pre_vendas
ON CONFLICT (id) DO NOTHING;

-- 3. RLS
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own orcamentos" ON public.orcamentos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user inserts own orcamentos" ON public.orcamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own orcamentos" ON public.orcamentos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user deletes own orcamentos" ON public.orcamentos
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON public.orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_checklist_id ON public.orcamentos(checklist_id);

-- 5. Trigger sync orcamentos → pre_vendas (bidirecional)
CREATE OR REPLACE FUNCTION public.sync_orcamento_to_prevenda()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.pre_vendas (id, user_id, cliente_id, nome_cliente, telefone_cliente, itens, valor_total, status, validade, observacoes, created_at)
    VALUES (NEW.id, NEW.user_id, NEW.cliente_id, NEW.nome_cliente, NEW.telefone_cliente, NEW.itens, NEW.valor_total, NEW.status, NEW.validade, NEW.observacoes, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      cliente_id = EXCLUDED.cliente_id,
      nome_cliente = EXCLUDED.nome_cliente,
      telefone_cliente = EXCLUDED.telefone_cliente,
      itens = EXCLUDED.itens,
      valor_total = EXCLUDED.valor_total,
      status = EXCLUDED.status,
      validade = EXCLUDED.validade,
      observacoes = EXCLUDED.observacoes;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.pre_vendas SET
      cliente_id = NEW.cliente_id,
      nome_cliente = NEW.nome_cliente,
      telefone_cliente = NEW.telefone_cliente,
      itens = NEW.itens,
      valor_total = NEW.valor_total,
      status = NEW.status,
      validade = NEW.validade,
      observacoes = NEW.observacoes
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.pre_vendas WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER sync_orcamento_to_prevenda_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.sync_orcamento_to_prevenda();
