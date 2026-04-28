-- =====================================================================
-- 011 — Natureza da despesa (fixa / variavel) na tabela financeiro
-- =====================================================================

alter table public.financeiro
  add column if not exists natureza text default null
    check (natureza is null or natureza in ('fixa', 'variavel'));

-- Preenche registros existentes de saída com 'variavel' como default conservador
update public.financeiro
  set natureza = 'variavel'
  where tipo = 'saida' and natureza is null;

-- Categorias tipicamente fixas: backfill conservador
update public.financeiro
  set natureza = 'fixa'
  where tipo = 'saida'
    and natureza = 'variavel'
    and lower(categoria) in ('aluguel', 'salário', 'salario', 'internet');
