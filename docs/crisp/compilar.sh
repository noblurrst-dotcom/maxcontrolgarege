#!/usr/bin/env bash
# Compila os 23 .md em 5 docs agrupados por tema. Roda de docs/crisp/.
set -euo pipefail
cd "$(dirname "$0")"

# Rebaixa todos os headings em 1 nível (# vira ##, ## vira ###, etc.)
demote() { sed -E 's/^(#{1,5}) /\1# /' "$1"; }

build() {
  local out="$1"; shift
  local title="$1"; shift
  local intro="$1"; shift
  {
    echo "# $title"
    echo
    echo "$intro"
    local first=1
    for f in "$@"; do
      echo
      echo "---"
      echo
      demote "$f"
    done
  } > "compilado/$out"
  echo "✓ $out ($(wc -l < "compilado/$out") linhas)"
}

build "01-introducao-e-acesso.md" \
  "1. Introdução, Acesso e Suporte" \
  "Tudo sobre o que é o A.T.A Gestão, como acessar, login, painel principal, uso no celular/offline e como obter ajuda." \
  00-visao-geral.md 01-cadastro-e-login.md 02-dashboard.md 20-pwa-mobile.md 22-suporte.md

build "02-cadastros-base.md" \
  "2. Cadastros Base — Clientes, Veículos, Serviços e Colaboradores" \
  "Como cadastrar e gerenciar clientes (com veículos e fotos), o catálogo de serviços, e a equipe (CLT, PJ, autônomos) com comissões." \
  03-clientes.md 04-veiculos.md 05-servicos.md 13-colaboradores.md

build "03-operacao.md" \
  "3. Operação — Vendas, Orçamentos, Pagamentos, Agenda, Checklists e Kanban" \
  "O coração da operação diária: registrar vendas, criar orçamentos, capturar pagamentos parciais ou totais, agendar serviços, fazer checklist do veículo e acompanhar o fluxo de produção pelo Kanban." \
  06-vendas.md 07-orcamentos.md 08-pagamentos.md 09-agenda.md 10-checklists.md 11-kanban.md

build "04-financeiro-folha-relatorios.md" \
  "4. Financeiro, Folha e Relatórios" \
  "Controle de entradas e saídas, contas bancárias, pagamento da equipe (salários, comissões, bônus), relatórios consolidados e configuração de impostos." \
  12-financeiro.md 14-pagamentos-colaboradores.md 15-relatorios.md 19-impostos.md

build "05-configuracoes-vitrine-usuarios-faq.md" \
  "5. Configurações, Vitrine, Usuários e FAQ Geral" \
  "Personalização do sistema (identidade visual, dados da empresa), página pública (vitrine digital) onde clientes agendam online, gestão de sub-usuários e permissões, e perguntas frequentes consolidadas." \
  16-configuracoes.md 17-vitrine-digital.md 18-usuarios-e-permissoes.md 21-faq-perguntas-frequentes.md

echo
echo "Compilação concluída."
