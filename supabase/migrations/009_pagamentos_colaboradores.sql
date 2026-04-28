-- =====================================================================
-- 009 — Pagamentos a colaboradores (salário, comissão, bônus, etc.)
-- =====================================================================

create table if not exists public.pagamentos_colaboradores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  colaborador_id uuid not null references public.funcionarios(id) on delete cascade,
  tipo text not null check (tipo in ('salario','comissao','bonus','adiantamento','outro')),
  valor numeric(10,2) not null,
  mes_referencia text not null,
  data_pagamento date not null,
  venda_id text references public.vendas(id) on delete set null,
  observacoes text default '',
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_pagcol_user_id
  on public.pagamentos_colaboradores(user_id);
create index if not exists idx_pagcol_colaborador_mes
  on public.pagamentos_colaboradores(colaborador_id, mes_referencia);
create index if not exists idx_pagcol_mes_ref
  on public.pagamentos_colaboradores(user_id, mes_referencia);

-- RLS
alter table public.pagamentos_colaboradores enable row level security;

drop policy if exists "pagcol_select_own" on public.pagamentos_colaboradores;
create policy "pagcol_select_own" on public.pagamentos_colaboradores
  for select using (auth.uid() = user_id);

drop policy if exists "pagcol_insert_own" on public.pagamentos_colaboradores;
create policy "pagcol_insert_own" on public.pagamentos_colaboradores
  for insert with check (auth.uid() = user_id);

drop policy if exists "pagcol_update_own" on public.pagamentos_colaboradores;
create policy "pagcol_update_own" on public.pagamentos_colaboradores
  for update using (auth.uid() = user_id);

drop policy if exists "pagcol_delete_own" on public.pagamentos_colaboradores;
create policy "pagcol_delete_own" on public.pagamentos_colaboradores
  for delete using (auth.uid() = user_id);
