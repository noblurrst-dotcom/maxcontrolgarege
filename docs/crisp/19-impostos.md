# Impostos

## O que é

Configuração do regime tributário e percentuais de impostos da empresa. Permite estimar o imposto incidente sobre cada venda e ter visão de quanto sobra de líquido.

## Como acessar

Menu **Configurações** → seção **Impostos** (ou módulo dedicado dependendo da versão).

## Regimes tributários suportados

- **Simples Nacional** — alíquota única simplificada conforme faixa de faturamento
- **Lucro Presumido** — IRPJ + CSLL + PIS + COFINS + ISS calculados sobre presunção
- **Lucro Real** — para empresas que apuram pelo lucro efetivo
- **MEI** — para microempreendedor individual
- **Sem regime** — não calcula impostos

## Como configurar

1. Selecione seu **Regime tributário**
2. Conforme o regime, preencha os percentuais aplicáveis:
   - **Alíquota total** (% sobre venda)
   - **ISS** (%)
   - **PIS / COFINS** (%)
   - **IRPJ / CSLL** (%) — se aplicável
3. Defina sobre quais tipos de receita aplicar
4. Salve

## Como o sistema calcula

Ao registrar uma venda, o sistema pode calcular:
- **Valor bruto** — o que o cliente pagou
- **Imposto estimado** — % aplicado conforme regime
- **Valor líquido** — bruto - imposto

Esses valores aparecem em relatórios financeiros.

## Estimativa, não substituição contábil

⚠️ Importante: o cálculo é uma **estimativa gerencial**, não substitui contabilidade.
- Não emite nota fiscal
- Não faz apuração mensal de impostos
- Não envia para a Receita

Use para ter ideia de margem e planejamento. Para apuração oficial, consulte seu contador.

## Como saber meu regime

- Olhe seu cartão CNPJ na Receita Federal
- Pergunte ao seu contador
- Veja na última DEFIS (Simples) ou ECF/DCTF (Presumido/Real)

## Mudei de regime — como atualizar

1. Vá em Configurações → Impostos
2. Mude o regime
3. Atualize as alíquotas
4. Salve

Vendas anteriores mantêm o cálculo da época. Novas vendas usam o novo regime.

## Diferentes alíquotas por tipo de serviço

Atualmente o cálculo é uma alíquota global. Para alíquotas variadas por tipo de serviço, faça o controle externo (contábil).

## Posso desativar o cálculo de impostos

Sim. Configure regime como **Sem regime** ou deixe alíquota 0%. O sistema não exibirá os valores de imposto.

## Imposto sobre folha (INSS, FGTS)

Não está incluído neste módulo (que cobre impostos sobre venda). Folha de funcionário CLT envolve INSS, FGTS, IRRF — controle separado, geralmente via folha do contador.

## Substituição tributária / ISS retido

Para serviços com ISS retido na fonte (cliente reteve e recolheu), use o cadastro do colaborador (ISS retido) ou ajuste manualmente o lançamento financeiro.
