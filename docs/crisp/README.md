# Base de Conhecimento — Crisp AI

Documentação para treinar a IA do Crisp Chat para responder dúvidas dos usuários sobre o A.T.A Gestão.

## ⚡ Versão compilada (5 documentos)

Para planos do Crisp que limitam a quantidade de artigos, use os 5 documentos consolidados em [`./compilado/`](./compilado/):

1. [`01-introducao-e-acesso.md`](./compilado/01-introducao-e-acesso.md) — Visão geral, login, painel, mobile/PWA, suporte
2. [`02-cadastros-base.md`](./compilado/02-cadastros-base.md) — Clientes, veículos, serviços, colaboradores
3. [`03-operacao.md`](./compilado/03-operacao.md) — Vendas, orçamentos, pagamentos, agenda, checklists, kanban
4. [`04-financeiro-folha-relatorios.md`](./compilado/04-financeiro-folha-relatorios.md) — Financeiro, folha, relatórios, impostos
5. [`05-configuracoes-vitrine-usuarios-faq.md`](./compilado/05-configuracoes-vitrine-usuarios-faq.md) — Configurações, vitrine, usuários, FAQ

Os arquivos compilados são gerados a partir dos 23 originais via [`./compilar.sh`](./compilar.sh). Para regenerar após edições:
```bash
cd docs/crisp && bash compilar.sh
```

## Como usar (versão completa, 23 artigos)

1. Acesse [app.crisp.chat](https://app.crisp.chat) → seu workspace
2. Vá em **Helpdesk** ou **Knowledge Base** → **Articles**
3. Importe cada `.md` como um artigo separado
4. Habilite a **MagicReply / Crisp AI** para responder com base nesses artigos

Alternativa: copie e cole o conteúdo de cada arquivo manualmente.

## Estrutura

### Fundamentos
- [00 — Visão Geral](./00-visao-geral.md)
- [01 — Cadastro e Login](./01-cadastro-e-login.md)
- [02 — Painel (Dashboard)](./02-dashboard.md)

### Cadastros base
- [03 — Clientes](./03-clientes.md)
- [04 — Veículos](./04-veiculos.md)
- [05 — Serviços](./05-servicos.md)

### Operação
- [06 — Vendas](./06-vendas.md)
- [07 — Orçamentos](./07-orcamentos.md)
- [08 — Pagamentos](./08-pagamentos.md)
- [09 — Agenda](./09-agenda.md)
- [10 — Checklists](./10-checklists.md)
- [11 — Kanban](./11-kanban.md)

### Financeiro
- [12 — Financeiro](./12-financeiro.md)
- [13 — Colaboradores](./13-colaboradores.md)
- [14 — Pagamentos a Colaboradores](./14-pagamentos-colaboradores.md)
- [15 — Relatórios](./15-relatorios.md)

### Configuração
- [16 — Configurações](./16-configuracoes.md)
- [17 — Vitrine Digital](./17-vitrine-digital.md)
- [18 — Usuários e Permissões](./18-usuarios-e-permissoes.md)
- [19 — Impostos](./19-impostos.md)

### Geral
- [20 — Aplicativo / Mobile / Offline](./20-pwa-mobile.md)
- [21 — Perguntas Frequentes (FAQ)](./21-faq-perguntas-frequentes.md)
- [22 — Suporte](./22-suporte.md)

## Manutenção

Quando o sistema ganhar novas funcionalidades:
1. Edite o arquivo correspondente (ou crie um novo)
2. Re-importe no Crisp para a IA aprender o novo conteúdo
3. Mantenha o tom: direto, instrucional, em segunda pessoa, sem jargão técnico

## Convenções de estilo

- **Tom**: amigável, direto, em português brasileiro
- **Pessoa**: segunda pessoa ("você acessa...", "você cadastra...")
- **Estrutura**: pergunta implícita como título de seção (## Como faço X)
- **Listas**: passos numerados para ações sequenciais; bullets para opções
- **Negrito**: nomes de botões, campos e termos importantes
- **Avisos**: usar ⚠️ para alertas importantes
- **Sem código**: evite blocos de código (a menos que seja link/URL)

## Total

23 artigos, ~60 KB, ~2.000 linhas de conteúdo.
