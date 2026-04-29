# Vendas

## O que é

O módulo Vendas registra as vendas realizadas. Cada venda tem cliente, serviço, valor, desconto, forma de pagamento, status e parcelas.

## Como acessar

Menu superior → **Vendas**.

## Como criar uma venda

1. Clique em **+ Nova venda**
2. Selecione o **cliente** (ou crie um novo direto pelo botão)
3. Preencha:
   - **Descrição** (serviço prestado, ou selecione do catálogo)
   - **Valor** (preço cheio)
   - **Desconto** (em valor R$ ou em percentual %)
   - **Forma de pagamento** (PIX, crédito, débito, dinheiro, boleto, transferência)
   - **Parcelas** (1 a 12)
   - **Data da venda**
   - **Funcionário/Colaborador** que executou
   - **Observações**
4. Opcionalmente, marque para criar agendamento junto (data + hora)
5. Clique em **Salvar**

Se o serviço for em outro dia, cria-se automaticamente um agendamento.

## Status de pagamento

Toda venda tem um status:

- **Pendente** — cliente ainda não pagou
- **Parcial** — pagou uma parte
- **Pago** — quitado
- **Cortesia** — gratuito (não conta no faturamento)
- **Cancelada** — venda anulada

O status é atualizado automaticamente conforme você captura pagamentos. Veja o tópico **Pagamentos**.

## Status da venda (aberta/fechada)

- **Aberta** — venda ainda em andamento
- **Fechada** — concluída

## Como aplicar desconto

No formulário de venda, no campo **Desconto**, você escolhe entre:
- **Valor** — desconto fixo em reais (ex: R$ 50,00)
- **Percentual** — desconto em % (ex: 10%)

O sistema calcula automaticamente o valor total final.

## Como editar uma venda existente

1. Clique sobre a venda na lista
2. Faça as alterações no painel de detalhes
3. Salve

⚠️ Algumas alterações podem afetar o financeiro automaticamente (entradas vinculadas).

## Como excluir uma venda

1. Abra a venda
2. Clique em **Excluir**
3. Confirme

A entrada do financeiro vinculada também é removida.

## Como cancelar uma venda (sem excluir)

1. Abra a venda
2. Clique em **Cancelar venda**
3. Status vira "cancelada", pagamentos são removidos do financeiro, mas a venda fica no histórico

## Como marcar como cortesia

1. Abra a venda
2. Clique em **Marcar como cortesia**
3. Pagamentos são removidos do financeiro, status fica "cortesia"

Útil quando você não cobra (cliente especial, retrabalho, etc.).

## Como filtrar vendas

Na lista, há filtros:
- Por **status de pagamento** (todos, pendente, parcial, pago, cortesia, cancelada)
- Por **período** (hoje, semana, mês, personalizado)
- Por **busca** (nome do cliente, descrição)

## Vendas com agendamento

Toda venda criada gera automaticamente um agendamento vinculado, mesmo que para o mesmo dia. Isso facilita o controle pela Agenda. Veja o tópico **Agenda**.

## Posso emitir um recibo/PDF da venda?

Sim. Na tela de detalhes da venda, há botão **Gerar PDF**. O PDF segue o template configurado em Configurações (logo, cores, dados da empresa).

## Posso vincular um colaborador específico à venda?

Sim. No formulário de venda, há campo **Colaborador**. Importante para cálculo de comissões na folha de pagamento dos colaboradores.

## Posso anexar um checklist à venda?

Sim. Cada venda pode ter um checklist embutido (estado do veículo, fotos, itens). Veja o tópico **Checklists**.
