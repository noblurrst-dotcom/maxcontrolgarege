-- =====================================================================
-- 012 — Vitrine Digital (perfil público + catálogo + auto-agendamento)
-- =====================================================================

-- 1) Configuração da vitrine (singleton por usuário)
create table if not exists public.vitrine_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null,
  ativo boolean default true,
  -- Perfil
  nome_empresa text not null default '',
  slogan text default '',
  descricao text default '',
  logo_url text default '',
  banner_url text default '',
  fotos jsonb default '[]'::jsonb,       -- array de URLs
  -- Contato
  telefone text default '',
  whatsapp text default '',
  email text default '',
  endereco text default '',
  cidade text default '',
  estado text default '',
  -- Redes sociais
  instagram_url text default '',
  facebook_url text default '',
  tiktok_url text default '',
  -- Aparência
  cor_primaria text default '#CFFF04',
  cor_secundaria text default '#0d0d1a',
  -- Agendamento
  aceita_agendamento boolean default true,
  horario_inicio text default '08:00',
  horario_fim text default '18:00',
  intervalo_min int default 30,
  dias_semana jsonb default '[1,2,3,4,5,6]'::jsonb, -- 0=dom, 6=sab
  antecedencia_max_dias int default 30,
  -- Meta
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índice para busca por slug (rota pública)
create unique index if not exists idx_vitrine_slug on public.vitrine_config(slug);

-- RLS: dono lê/escreve, público lê vitrines ativas
alter table public.vitrine_config enable row level security;

drop policy if exists "vitrine_select_own" on public.vitrine_config;
create policy "vitrine_select_own" on public.vitrine_config
  for select using (auth.uid() = user_id);

drop policy if exists "vitrine_select_public" on public.vitrine_config;
create policy "vitrine_select_public" on public.vitrine_config
  for select using (ativo = true);

drop policy if exists "vitrine_insert_own" on public.vitrine_config;
create policy "vitrine_insert_own" on public.vitrine_config
  for insert with check (auth.uid() = user_id);

drop policy if exists "vitrine_update_own" on public.vitrine_config;
create policy "vitrine_update_own" on public.vitrine_config
  for update using (auth.uid() = user_id);

drop policy if exists "vitrine_delete_own" on public.vitrine_config;
create policy "vitrine_delete_own" on public.vitrine_config
  for delete using (auth.uid() = user_id);


-- 2) Serviços publicados na vitrine
create table if not exists public.vitrine_servicos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  servico_id text not null,              -- FK lógica para servicos.id (text)
  visivel boolean default true,
  ordem int default 0,
  preco_vitrine numeric(10,2),           -- preço customizado para vitrine (null = usa padrão)
  created_at timestamptz default now(),
  unique(user_id, servico_id)
);

alter table public.vitrine_servicos enable row level security;

drop policy if exists "vs_select_own" on public.vitrine_servicos;
create policy "vs_select_own" on public.vitrine_servicos
  for select using (auth.uid() = user_id);

drop policy if exists "vs_select_public" on public.vitrine_servicos;
create policy "vs_select_public" on public.vitrine_servicos
  for select using (visivel = true);

drop policy if exists "vs_insert_own" on public.vitrine_servicos;
create policy "vs_insert_own" on public.vitrine_servicos
  for insert with check (auth.uid() = user_id);

drop policy if exists "vs_update_own" on public.vitrine_servicos;
create policy "vs_update_own" on public.vitrine_servicos
  for update using (auth.uid() = user_id);

drop policy if exists "vs_delete_own" on public.vitrine_servicos;
create policy "vs_delete_own" on public.vitrine_servicos
  for delete using (auth.uid() = user_id);


-- 3) Agendamentos feitos pelo visitante (sem auth)
create table if not exists public.vitrine_agendamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Dados do visitante
  nome_cliente text not null,
  telefone_cliente text not null,
  email_cliente text default '',
  placa text default '',
  veiculo text default '',
  -- Serviço e horário
  servico_id text not null,
  servico_nome text not null,
  data_hora text not null,           -- ISO datetime
  data_hora_fim text not null,
  duracao_min int not null default 60,
  valor numeric(10,2) default 0,
  -- Status
  status text not null default 'pendente'
    check (status in ('pendente','confirmado','cancelado','concluido')),
  observacoes text default '',
  created_at timestamptz default now()
);

create index if not exists idx_va_user_id on public.vitrine_agendamentos(user_id);
create index if not exists idx_va_data on public.vitrine_agendamentos(user_id, data_hora);

alter table public.vitrine_agendamentos enable row level security;

-- Dono vê todos os seus
drop policy if exists "va_select_own" on public.vitrine_agendamentos;
create policy "va_select_own" on public.vitrine_agendamentos
  for select using (auth.uid() = user_id);

-- Visitante anônimo pode inserir (service_role ou anon com RLS)
drop policy if exists "va_insert_anon" on public.vitrine_agendamentos;
create policy "va_insert_anon" on public.vitrine_agendamentos
  for insert with check (true);

drop policy if exists "va_update_own" on public.vitrine_agendamentos;
create policy "va_update_own" on public.vitrine_agendamentos
  for update using (auth.uid() = user_id);

drop policy if exists "va_delete_own" on public.vitrine_agendamentos;
create policy "va_delete_own" on public.vitrine_agendamentos
  for delete using (auth.uid() = user_id);
