# 4. Financeiro, Folha e Relatórios

Controle de entradas e saídas, contas bancárias, pagamento da equipe (salários, comissões, bônus), relatórios consolidados e configuração de impostos.

---

## Financeiro

### O que é

O módulo Financeiro registra todas as entradas (receitas) e saídas (despesas) da empresa. Permite controle de fluxo de caixa, contas bancárias e categorização.

### Como acessar

Menu superior → **Financeiro**.

### Como lançar uma entrada (receita)

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

### Como lançar uma saída (despesa)

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

### Categorias

Categorias são livres — você cria conforme cadastra. Sugestões:

#### Entradas
- Venda
- Serviço extra
- Receita de comissão
- Outros

#### Saídas
- Aluguel
- Energia / Água
- Insumos / Materiais
- Salários
- Comissões
- Marketing
- Manutenção
- Impostos
- Outros

### Natureza da despesa (fixa ou variável)

- **Fixa**: ocorre todo mês com valor parecido (aluguel, salário)
- **Variável**: depende do volume (insumos, comissões)

Útil para análise gerencial — saber quanto da despesa é fixa e quanto pode variar.

### Status de pago

- **Pago = sim**: já saiu/entrou efetivamente
- **Pago = não**: previsto mas não realizado (a pagar/receber)

Use isso para projeções de fluxo de caixa.

### Contas bancárias

Você pode cadastrar suas contas bancárias e carteiras:
- Conta corrente
- Poupança
- Carteira (dinheiro físico)

Cada conta tem nome, banco e saldo. Movimentações de entrada/saída atualizam o saldo.

#### Como cadastrar uma conta
Em Financeiro → seção **Contas bancárias** → **+ Nova conta**.

### Lançamentos automáticos vindos de Vendas

Quando você captura pagamento de uma venda com **Lançar no financeiro** marcado, é gerada automaticamente uma entrada com:
- Categoria: Venda
- Descrição: Pagamento - Nome do Cliente
- Valor: do pagamento
- Forma: a escolhida no pagamento
- Pago: sim

Você pode editar esses lançamentos depois normalmente.

### Como filtrar o Financeiro

Filtros disponíveis:
- Por **período** (mês, semana, personalizado)
- Por **tipo** (entrada / saída)
- Por **categoria**
- Por **status** (pago / pendente)
- Por **conta bancária**
- Por **busca** (descrição)

### Como editar um lançamento

Clique sobre o lançamento na lista, ajuste os campos e salve.

### Como excluir um lançamento

Abra o lançamento e clique em **Excluir**.

⚠️ Se for um lançamento gerado automaticamente por venda, considere excluir/cancelar a venda em vez de só apagar o lançamento — assim mantém os dados sincronizados.

### Saldo da conta

Cada conta tem saldo atualizado automaticamente conforme entradas/saídas que referenciam ela.

### Posso importar extrato bancário?

Não no momento. Lançamentos são manuais (ou automáticos via vendas).

### Relatório financeiro

Para análises mais profundas (DRE, comparativo mensal, lucro líquido), vá em **Relatórios**. Veja o tópico **Relatórios**.

---

## Pagamentos a Colaboradores

### O que é

Registro de pagamentos feitos aos colaboradores: salário mensal, comissões sobre vendas, bônus, adiantamentos.

### Como acessar

Menu superior → **Colaboradores** → seção **Pagamentos**. Ou em **Financeiro** dependendo da versão.

### Tipos de pagamento

- **Salário** — pagamento mensal regular (CLT)
- **Comissão** — % sobre vendas atribuídas
- **Bônus** — extra eventual
- **Adiantamento** — antecipação de salário
- **Outro** — qualquer outro tipo

### Como lançar um pagamento

1. Clique em **+ Novo pagamento**
2. Selecione o **colaborador**
3. Escolha o **tipo** (salário, comissão, bônus, adiantamento, outro)
4. Preencha:
   - **Valor**
   - **Mês de referência** (a qual mês se refere — formato YYYY-MM)
   - **Data do pagamento** (quando saiu o dinheiro)
   - **Venda relacionada** (se for comissão de venda específica)
   - **Observações**
5. Salve

O pagamento gera lançamento no Financeiro como saída.

### Mês de referência

Importante diferenciar:
- **Data do pagamento**: quando o dinheiro saiu
- **Mês de referência**: a qual mês de trabalho se refere

Exemplo: salário de janeiro pago em 5/fev. Data do pagamento = 05/02, Mês de referência = 2026-01.

### Como ver pagamentos de um colaborador

Filtre a lista por colaborador, ou abra o cadastro do colaborador para ver o histórico de pagamentos dele.

### Como calcular total da folha do mês

Filtre os pagamentos pelo mês de referência e some o total. Ou use **Relatórios** para uma visão consolidada.

### Comissões automáticas?

O sistema calcula a comissão devida com base no % do colaborador e nas vendas atribuídas a ele, mas **o lançamento do pagamento da comissão é manual** — você decide quando e quanto pagar (mensal, semanal, por venda concluída).

### Como editar um pagamento

Clique sobre o pagamento na lista → ajuste → salve.

### Como excluir um pagamento

Abra o pagamento → **Excluir** → confirme.

A entrada correspondente no financeiro também é removida.

### Adiantamento

Adiantamento é uma antecipação. Para o controle ficar certo:
1. Lance o **adiantamento** quando o dinheiro sair (tipo: adiantamento)
2. Ao pagar o salário do mês, lance o salário cheio
3. Use o campo de observações para registrar que houve adiantamento já descontado

(O sistema não desconta automaticamente; é controle manual.)

### Como gerar recibo do pagamento

Não há geração automática de recibo de pagamento de funcionário no momento. Use o recibo da conta bancária / transferência como comprovante.

### Relatório de folha

Em **Relatórios** você encontra visões consolidadas da folha por período, colaborador, tipo de pagamento.

---

## Relatórios

### O que é

Análises consolidadas dos dados do sistema: vendas, financeiro, colaboradores, clientes. Permite filtrar por período e exportar.

### Como acessar

Menu superior → **Relatórios**.

### Relatórios disponíveis

#### Vendas
- Total vendido no período
- Ticket médio
- Vendas por forma de pagamento
- Vendas por status (pago, parcial, pendente, cortesia)
- Vendas por colaborador
- Top serviços vendidos
- Top clientes

#### Financeiro
- Entradas e saídas no período
- Saldo por conta bancária
- Despesas por categoria
- Comparativo mês a mês
- Despesas fixas vs variáveis
- DRE simplificado (receita - despesa = lucro)

#### Clientes
- Clientes mais frequentes
- Aniversariantes do mês
- Clientes inativos (não compram há X tempo)
- Total gasto por cliente

#### Agenda / Operação
- Agendamentos por status
- Taxa de conclusão (concluídos / total)
- Cancelamentos no período
- Horários mais movimentados

#### Colaboradores
- Pagamentos por colaborador
- Vendas atribuídas por colaborador
- Comissões devidas
- Folha do mês

### Como filtrar

Cada relatório tem filtros:
- **Período** (hoje, semana, mês, personalizado)
- **Colaborador** (quando aplicável)
- **Categoria**
- **Conta bancária**

### Como exportar

Os relatórios podem ser exportados em:
- **PDF** — para apresentação ou arquivo
- **CSV** — para importar no Excel/Sheets para análises próprias

Procure pelo botão de exportação no canto do relatório.

### Os números são em tempo real?

Sim. Sempre que você abre/atualiza o relatório, os dados são recalculados a partir do que está cadastrado.

### Diferença entre Painel e Relatórios

- **Painel**: visão rápida, números principais, gráficos resumidos
- **Relatórios**: análise detalhada, filtros profundos, exportação

### Como saber meu lucro do mês

1. Vá em **Relatórios** → Financeiro
2. Filtre o período "este mês"
3. Veja o **DRE simplificado** ou comparativo Receita - Despesa
4. O lucro é Receita - Despesa

⚠️ Lucro contábil exato depende de regime tributário, depreciação e outros fatores. O sistema oferece visão gerencial, não contábil.

### Posso programar envio de relatórios por email

Atualmente não. O envio é manual (baixar PDF/CSV e compartilhar).

### Comparação ano anterior

Em Relatórios financeiros, há opção de comparar com período anterior (mês passado, ano passado). Verifique se está disponível na sua versão.

### Algum relatório não bate com o que vejo na lista

Possíveis causas:
- Filtros aplicados (período, colaborador, etc.)
- Vendas canceladas/cortesia desconsideradas em alguns relatórios
- Lançamentos com data futura ou retroativa

Confira sempre o filtro de período antes de comparar.

---

## Impostos

### O que é

Configuração do regime tributário e percentuais de impostos da empresa. Permite estimar o imposto incidente sobre cada venda e ter visão de quanto sobra de líquido.

### Como acessar

Menu **Configurações** → seção **Impostos** (ou módulo dedicado dependendo da versão).

### Regimes tributários suportados

- **Simples Nacional** — alíquota única simplificada conforme faixa de faturamento
- **Lucro Presumido** — IRPJ + CSLL + PIS + COFINS + ISS calculados sobre presunção
- **Lucro Real** — para empresas que apuram pelo lucro efetivo
- **MEI** — para microempreendedor individual
- **Sem regime** — não calcula impostos

### Como configurar

1. Selecione seu **Regime tributário**
2. Conforme o regime, preencha os percentuais aplicáveis:
   - **Alíquota total** (% sobre venda)
   - **ISS** (%)
   - **PIS / COFINS** (%)
   - **IRPJ / CSLL** (%) — se aplicável
3. Defina sobre quais tipos de receita aplicar
4. Salve

### Como o sistema calcula

Ao registrar uma venda, o sistema pode calcular:
- **Valor bruto** — o que o cliente pagou
- **Imposto estimado** — % aplicado conforme regime
- **Valor líquido** — bruto - imposto

Esses valores aparecem em relatórios financeiros.

### Estimativa, não substituição contábil

⚠️ Importante: o cálculo é uma **estimativa gerencial**, não substitui contabilidade.
- Não emite nota fiscal
- Não faz apuração mensal de impostos
- Não envia para a Receita

Use para ter ideia de margem e planejamento. Para apuração oficial, consulte seu contador.

### Como saber meu regime

- Olhe seu cartão CNPJ na Receita Federal
- Pergunte ao seu contador
- Veja na última DEFIS (Simples) ou ECF/DCTF (Presumido/Real)

### Mudei de regime — como atualizar

1. Vá em Configurações → Impostos
2. Mude o regime
3. Atualize as alíquotas
4. Salve

Vendas anteriores mantêm o cálculo da época. Novas vendas usam o novo regime.

### Diferentes alíquotas por tipo de serviço

Atualmente o cálculo é uma alíquota global. Para alíquotas variadas por tipo de serviço, faça o controle externo (contábil).

### Posso desativar o cálculo de impostos

Sim. Configure regime como **Sem regime** ou deixe alíquota 0%. O sistema não exibirá os valores de imposto.

### Imposto sobre folha (INSS, FGTS)

Não está incluído neste módulo (que cobre impostos sobre venda). Folha de funcionário CLT envolve INSS, FGTS, IRRF — controle separado, geralmente via folha do contador.

### Substituição tributária / ISS retido

Para serviços com ISS retido na fonte (cliente reteve e recolheu), use o cadastro do colaborador (ISS retido) ou ajuste manualmente o lançamento financeiro.
