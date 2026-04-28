-- =====================================================================
-- 010 — Configuracao de impostos (singleton por usuario)
-- =====================================================================

create table if not exists public.configuracao_impostos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  regime text not null default 'simples_nacional'
    check (regime in ('simples_nacional','lucro_presumido','lucro_real')),
  -- Simples Nacional
  aliquota_simples numeric(5,2) default 6.00,
  -- Lucro Presumido / Real
  aliquota_pis numeric(5,2) default 0.65,
  aliquota_cofins numeric(5,2) default 3.00,
  aliquota_irpj numeric(5,2) default 4.80,
  aliquota_csll numeric(5,2) default 2.88,
  aliquota_iss numeric(5,2) default 5.00,
  -- Geral
  observacoes text default '',
  updated_at timestamptz default now()
);

-- RLS
alter table public.configuracao_impostos enable row level security;

drop policy if exists "impconfig_select_own" on public.configuracao_impostos;
create policy "impconfig_select_own" on public.configuracao_impostos
  for select using (auth.uid() = user_id);

drop policy if exists "impconfig_insert_own" on public.configuracao_impostos;
create policy "impconfig_insert_own" on public.configuracao_impostos
  for insert with check (auth.uid() = user_id);

drop policy if exists "impconfig_update_own" on public.configuracao_impostos;
create policy "impconfig_update_own" on public.configuracao_impostos
  for update using (auth.uid() = user_id);

drop policy if exists "impconfig_delete_own" on public.configuracao_impostos;
create policy "impconfig_delete_own" on public.configuracao_impostos
  for delete using (auth.uid() = user_id);
