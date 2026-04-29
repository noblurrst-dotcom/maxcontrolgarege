# Pagamentos

## O que é

Cada venda pode receber um ou mais pagamentos até ser quitada. Você captura pagamentos parciais ou totais conforme o cliente paga.

## Como capturar um pagamento

1. Abra a venda na lista
2. Clique em **Capturar pagamento**
3. No modal:
   - **Valor** (pode ser parcial ou total)
   - **Forma de pagamento** (PIX, crédito, débito, dinheiro, boleto, transferência)
   - **Parcelas** (1 a 12 — se for cartão de crédito parcelado)
   - **Data do pagamento**
   - **Observações**
   - **Lançar no financeiro** (marcado por padrão — gera entrada automaticamente)
4. Clique em **Confirmar**

O status da venda é recalculado automaticamente:
- Se total pago < valor da venda → **parcial**
- Se total pago = valor da venda → **pago**

## Pagamentos parciais

Você pode capturar vários pagamentos. Exemplo:
- Venda de R$ 600
- Cliente paga R$ 200 no PIX agora → status: parcial
- Depois paga R$ 400 no cartão → status: pago

Cada pagamento é registrado separadamente com data e forma.

## Como ver pagamentos de uma venda

Na tela de detalhes da venda, há a seção **Pagamentos** listando todos os pagamentos com data, valor e forma.

## Como excluir um pagamento

1. Abra a venda
2. Em Pagamentos, clique em ❌/excluir ao lado do pagamento
3. Confirme

A entrada correspondente no financeiro também é removida e o status da venda é recalculado.

## Formas de pagamento aceitas

- **PIX**
- **Crédito** (com parcelas)
- **Débito**
- **Dinheiro**
- **Boleto**
- **Transferência**

## Cortesia (gratuito)

Se a venda foi gratuita (cliente especial, retrabalho, brinde):
1. Abra a venda
2. Clique em **Marcar como cortesia**
3. Status vira "cortesia", pagamentos somem, não conta no faturamento

## Cancelar pagamento de venda

Se a venda foi cancelada/desistida:
1. Abra a venda
2. Clique em **Cancelar venda**
3. Pagamentos e entradas no financeiro são removidos

## O que é "Lançar no financeiro"?

Quando você captura um pagamento, por padrão é gerada uma entrada automática no Financeiro com:
- Tipo: entrada
- Categoria: Venda
- Valor do pagamento
- Forma de pagamento

Se você marcar **NÃO lançar no financeiro**, o pagamento fica registrado na venda mas não vira entrada — útil quando o financeiro é controlado em outro sistema.

## Posso editar um pagamento já capturado?

Não há edição direta. Para corrigir, exclua o pagamento errado e capture um novo correto.

## O sistema soma os pagamentos automaticamente?

Sim. O campo **Valor pago** da venda mostra o total já recebido. O sistema também atualiza o status (pendente → parcial → pago) automaticamente.

## Pagamento por agendamento (sem venda prévia)

Você pode capturar pagamento direto de um agendamento. O sistema cria a venda e o pagamento juntos. Útil para vendas rápidas no balcão.
