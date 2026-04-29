-- 019_remove_brand_colors.sql
-- Remove as colunas de customização de cor da tabela brand_config.
-- A paleta do A.T.A Gestão passa a ser fixa (definida em src/index.css).

alter table public.brand_config
  drop column if exists cor_primaria,
  drop column if exists cor_secundaria,
  drop column if exists cor_texto;
