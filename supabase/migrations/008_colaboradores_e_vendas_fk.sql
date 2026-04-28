-- =====================================================================
-- 008 — Colaboradores (CLT/Freelancer PJ/Autônomo) + FK em vendas
-- =====================================================================
-- IDEMPOTENTE: usa `if not exists` em tudo para funcionar tanto em
-- ambientes onde a tabela `funcionarios` já existe (criada manualmente
-- no painel) quanto em ambientes limpos.

-- 1. Criar tabela base se nunca existiu
create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cargo text default '',
  telefone text default '',
  salario numeric(10,2) default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- 2. Estender com campos novos (CLT/Freelancer/Comum)
alter table public.funcionarios
  add column if not exists tipo text
    default 'clt',
  add column if not exists email text default '',
  add column if not exists cpf_cnpj text default '',
  add column if not exists data_admissao date,
  -- CLT
  add column if not exists vale_transporte numeric(10,2) default 0,
  add column if not exists vale_alimentacao numeric(10,2) default 0,
  add column if not exists plano_saude numeric(10,2) default 0,
  add column if not exists outros_beneficios numeric(10,2) default 0,
  -- Freelancer PJ/Autônomo
  add column if not exists valor_servico_padrao numeric(10,2) default 0,
  add column if not exists iss_retido_percentual numeric(5,2) default 0,
  -- Comum
  add column if not exists comissao_percentual numeric(5,2) default 0,
  add column if not exists observacoes text default '';

-- 3. Constraints (adicionadas separadamente para serem idempotentes)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'funcionarios_tipo_check') then
    alter table public.funcionarios
      add constraint funcionarios_tipo_check
      check (tipo in ('clt','freelancer_pj','freelancer_autonomo'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'funcionarios_iss_range_check') then
    alter table public.funcionarios
      add constraint funcionarios_iss_range_check
      check (iss_retido_percentual >= 0 and iss_retido_percentual <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'funcionarios_comissao_range_check') then
    alter table public.funcionarios
      add constraint funcionarios_comissao_range_check
      check (comissao_percentual >= 0 and comissao_percentual <= 100);
  end if;
end $$;

-- 4. FK opcional em vendas (mantém compat com coluna texto `funcionario`)
alter table public.vendas
  add column if not exists colaborador_id uuid
    references public.funcionarios(id) on delete set null;

-- 5. Índices
create index if not exists idx_funcionarios_user_id
  on public.funcionarios(user_id);
create index if not exists idx_funcionarios_ativo
  on public.funcionarios(user_id, ativo);
create index if not exists idx_vendas_colaborador_id
  on public.vendas(colaborador_id);

-- 6. RLS (idempotente: DROP POLICY IF EXISTS + CREATE)
alter table public.funcionarios enable row level security;

drop policy if exists "funcionarios_select_own" on public.funcionarios;
create policy "funcionarios_select_own" on public.funcionarios
  for select using (auth.uid() = user_id);

drop policy if exists "funcionarios_insert_own" on public.funcionarios;
create policy "funcionarios_insert_own" on public.funcionarios
  for insert with check (auth.uid() = user_id);

drop policy if exists "funcionarios_update_own" on public.funcionarios;
create policy "funcionarios_update_own" on public.funcionarios
  for update using (auth.uid() = user_id);

drop policy if exists "funcionarios_delete_own" on public.funcionarios;
create policy "funcionarios_delete_own" on public.funcionarios
  for delete using (auth.uid() = user_id);

-- 7. Backfill conservador de vendas.colaborador_id (opção aprovada pelo usuário):
-- match exato case-insensitive + trim, dentro do mesmo user_id.
-- Vendas sem match exato permanecem com colaborador_id = NULL.
update public.vendas v
set colaborador_id = f.id
from public.funcionarios f
where v.colaborador_id is null
  and v.funcionario is not null
  and trim(v.funcionario) <> ''
  and v.user_id = f.user_id
  and lower(trim(v.funcionario)) = lower(trim(f.nome));
