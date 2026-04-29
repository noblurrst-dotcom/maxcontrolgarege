# Financeiro

## O que é

O módulo Financeiro registra todas as entradas (receitas) e saídas (despesas) da empresa. Permite controle de fluxo de caixa, contas bancárias e categorização.

## Como acessar

Menu superior → **Financeiro**.

## Como lançar uma entrada (receita)

1. Clique em **+ Nova entrada** ou similar
2. Preencha:
   - **Categoria** (Venda, Serviço extra, Receita financeira, Outros)
   - **Descrição**
   - **Valor**
   - **Data**
   - **Conta bancária** (a qual conta entrou)
   - **Forma de pagamento** (PIX, dinheiro, etc.)
   - **Pago** (sim/não — se ainda não recebeu, deixe não)
3. Salve

## Como lançar uma saída (despesa)

1. Clique em **+ Nova saída**
2. Preencha:
   - **Categoria** (Aluguel, Salário, Insumos, Marketing, etc.)
   - **Descrição**
   - **Valor**
   - **Data**
   - **Conta bancária** (de qual conta saiu)
   - **Natureza** (fixa ou variável)
   - **Pago** (sim/não)
3. Salve

## Categorias

Categorias são livres — você cria conforme cadastra. Sugestões:

### Entradas
- Venda
- Serviço extra
- Receita de comissão
- Outros

### Saídas
- Aluguel
- Energia / Água
- Insumos / Materiais
- Salários
- Comissões
- Marketing
- Manutenção
- Impostos
- Outros

## Natureza da despesa (fixa ou variável)

- **Fixa**: ocorre todo mês com valor parecido (aluguel, salário)
- **Variável**: depende do volume (insumos, comissões)

Útil para análise gerencial — saber quanto da despesa é fixa e quanto pode variar.

## Status de pago

- **Pago = sim**: já saiu/entrou efetivamente
- **Pago = não**: previsto mas não realizado (a pagar/receber)

Use isso para projeções de fluxo de caixa.

## Contas bancárias

Você pode cadastrar suas contas bancárias e carteiras:
- Conta corrente
- Poupança
- Carteira (dinheiro físico)

Cada conta tem nome, banco e saldo. Movimentações de entrada/saída atualizam o saldo.

### Como cadastrar uma conta
Em Financeiro → seção **Contas bancárias** → **+ Nova conta**.

## Lançamentos automáticos vindos de Vendas

Quando você captura pagamento de uma venda com **Lançar no financeiro** marcado, é gerada automaticamente uma entrada com:
- Categoria: Venda
- Descrição: Pagamento - Nome do Cliente
- Valor: do pagamento
- Forma: a escolhida no pagamento
- Pago: sim

Você pode editar esses lançamentos depois normalmente.

## Como filtrar o Financeiro

Filtros disponíveis:
- Por **período** (mês, semana, personalizado)
- Por **tipo** (entrada / saída)
- Por **categoria**
- Por **status** (pago / pendente)
- Por **conta bancária**
- Por **busca** (descrição)

## Como editar um lançamento

Clique sobre o lançamento na lista, ajuste os campos e salve.

## Como excluir um lançamento

Abra o lançamento e clique em **Excluir**.

⚠️ Se for um lançamento gerado automaticamente por venda, considere excluir/cancelar a venda em vez de só apagar o lançamento — assim mantém os dados sincronizados.

## Saldo da conta

Cada conta tem saldo atualizado automaticamente conforme entradas/saídas que referenciam ela.

## Posso importar extrato bancário?

Não no momento. Lançamentos são manuais (ou automáticos via vendas).

## Relatório financeiro

Para análises mais profundas (DRE, comparativo mensal, lucro líquido), vá em **Relatórios**. Veja o tópico **Relatórios**.
