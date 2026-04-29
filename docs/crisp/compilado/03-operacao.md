# 3. Operação — Vendas, Orçamentos, Pagamentos, Agenda, Checklists e Kanban

O coração da operação diária: registrar vendas, criar orçamentos, capturar pagamentos parciais ou totais, agendar serviços, fazer checklist do veículo e acompanhar o fluxo de produção pelo Kanban.

---

## Vendas

### O que é

O módulo Vendas registra as vendas realizadas. Cada venda tem cliente, serviço, valor, desconto, forma de pagamento, status e parcelas.

### Como acessar

Menu superior → **Vendas**.

### Como criar uma venda

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

### Status de pagamento

Toda venda tem um status:

- **Pendente** — cliente ainda não pagou
- **Parcial** — pagou uma parte
- **Pago** — quitado
- **Cortesia** — gratuito (não conta no faturamento)
- **Cancelada** — venda anulada

O status é atualizado automaticamente conforme você captura pagamentos. Veja o tópico **Pagamentos**.

### Status da venda (aberta/fechada)

- **Aberta** — venda ainda em andamento
- **Fechada** — concluída

### Como aplicar desconto

No formulário de venda, no campo **Desconto**, você escolhe entre:
- **Valor** — desconto fixo em reais (ex: R$ 50,00)
- **Percentual** — desconto em % (ex: 10%)

O sistema calcula automaticamente o valor total final.

### Como editar uma venda existente

1. Clique sobre a venda na lista
2. Faça as alterações no painel de detalhes
3. Salve

⚠️ Algumas alterações podem afetar o financeiro automaticamente (entradas vinculadas).

### Como excluir uma venda

1. Abra a venda
2. Clique em **Excluir**
3. Confirme

A entrada do financeiro vinculada também é removida.

### Como cancelar uma venda (sem excluir)

1. Abra a venda
2. Clique em **Cancelar venda**
3. Status vira "cancelada", pagamentos são removidos do financeiro, mas a venda fica no histórico

### Como marcar como cortesia

1. Abra a venda
2. Clique em **Marcar como cortesia**
3. Pagamentos são removidos do financeiro, status fica "cortesia"

Útil quando você não cobra (cliente especial, retrabalho, etc.).

### Como filtrar vendas

Na lista, há filtros:
- Por **status de pagamento** (todos, pendente, parcial, pago, cortesia, cancelada)
- Por **período** (hoje, semana, mês, personalizado)
- Por **busca** (nome do cliente, descrição)

### Vendas com agendamento

Toda venda criada gera automaticamente um agendamento vinculado, mesmo que para o mesmo dia. Isso facilita o controle pela Agenda. Veja o tópico **Agenda**.

### Posso emitir um recibo/PDF da venda?

Sim. Na tela de detalhes da venda, há botão **Gerar PDF**. O PDF segue o template configurado em Configurações (logo, cores, dados da empresa).

### Posso vincular um colaborador específico à venda?

Sim. No formulário de venda, há campo **Colaborador**. Importante para cálculo de comissões na folha de pagamento dos colaboradores.

### Posso anexar um checklist à venda?

Sim. Cada venda pode ter um checklist embutido (estado do veículo, fotos, itens). Veja o tópico **Checklists**.

---

## Orçamentos

### O que é

Orçamento é uma proposta de venda enviada para o cliente, antes de fechar negócio. O cliente pode aprovar ou recusar. Quando aprovado, o orçamento vira venda.

### Como acessar

Menu **Vendas** → aba **Orçamentos** (ou tab no topo da página).

### Como criar um orçamento

1. Na aba Orçamentos, clique em **+ Novo orçamento**
2. Selecione o cliente (ou cadastre um novo)
3. Adicione os itens:
   - Descrição do serviço
   - Quantidade
   - Valor unitário
4. O valor total é calculado automaticamente
5. Defina:
   - **Validade** (até quando o orçamento é válido)
   - **Observações**
6. Salve

### Como adicionar vários itens

Cada item do orçamento é uma linha. Clique em **+ Adicionar item** para cada serviço/produto.

### Status do orçamento

- **Pendente** — aguardando resposta do cliente
- **Aprovado** — cliente aceitou (você pode converter em venda)
- **Recusado** — cliente não quis fechar

### Como aprovar um orçamento

1. Abra o orçamento
2. Clique em **Aprovar**
3. O status muda para "aprovado"
4. Você pode então convertê-lo em venda com 1 clique

### Como converter orçamento em venda

1. Abra o orçamento aprovado
2. Clique em **Converter em venda**
3. Os dados vêm preenchidos no formulário de venda
4. Confirme/ajuste e salve

### Como recusar/excluir um orçamento

- **Recusar**: marca como recusado mas mantém histórico
- **Excluir**: remove permanentemente

Use Recusar para acompanhar conversão de orçamentos. Excluir só para erros de cadastro.

### Como enviar o orçamento para o cliente

1. Abra o orçamento
2. Clique em **Gerar PDF**
3. Baixe o arquivo
4. Envie por WhatsApp, email ou outra forma

O PDF tem o nome da sua empresa, logo, cores e dados configurados em Configurações.

### Validade do orçamento

Você define uma data de validade ao criar. O sistema mostra um aviso quando o orçamento está vencido.

### Posso editar um orçamento depois de criado?

Sim, enquanto estiver pendente. Após aprovado e convertido em venda, edite a venda diretamente.

### Como ver histórico de orçamentos por cliente

Na ficha do cliente, há a seção **Histórico** que lista vendas e orçamentos relacionados.

---

## Pagamentos

### O que é

Cada venda pode receber um ou mais pagamentos até ser quitada. Você captura pagamentos parciais ou totais conforme o cliente paga.

### Como capturar um pagamento

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

### Pagamentos parciais

Você pode capturar vários pagamentos. Exemplo:
- Venda de R$ 600
- Cliente paga R$ 200 no PIX agora → status: parcial
- Depois paga R$ 400 no cartão → status: pago

Cada pagamento é registrado separadamente com data e forma.

### Como ver pagamentos de uma venda

Na tela de detalhes da venda, há a seção **Pagamentos** listando todos os pagamentos com data, valor e forma.

### Como excluir um pagamento

1. Abra a venda
2. Em Pagamentos, clique em ❌/excluir ao lado do pagamento
3. Confirme

A entrada correspondente no financeiro também é removida e o status da venda é recalculado.

### Formas de pagamento aceitas

- **PIX**
- **Crédito** (com parcelas)
- **Débito**
- **Dinheiro**
- **Boleto**
- **Transferência**

### Cortesia (gratuito)

Se a venda foi gratuita (cliente especial, retrabalho, brinde):
1. Abra a venda
2. Clique em **Marcar como cortesia**
3. Status vira "cortesia", pagamentos somem, não conta no faturamento

### Cancelar pagamento de venda

Se a venda foi cancelada/desistida:
1. Abra a venda
2. Clique em **Cancelar venda**
3. Pagamentos e entradas no financeiro são removidos

### O que é "Lançar no financeiro"?

Quando você captura um pagamento, por padrão é gerada uma entrada automática no Financeiro com:
- Tipo: entrada
- Categoria: Venda
- Valor do pagamento
- Forma de pagamento

Se você marcar **NÃO lançar no financeiro**, o pagamento fica registrado na venda mas não vira entrada — útil quando o financeiro é controlado em outro sistema.

### Posso editar um pagamento já capturado?

Não há edição direta. Para corrigir, exclua o pagamento errado e capture um novo correto.

### O sistema soma os pagamentos automaticamente?

Sim. O campo **Valor pago** da venda mostra o total já recebido. O sistema também atualiza o status (pendente → parcial → pago) automaticamente.

### Pagamento por agendamento (sem venda prévia)

Você pode capturar pagamento direto de um agendamento. O sistema cria a venda e o pagamento juntos. Útil para vendas rápidas no balcão.

---

## Agenda

### O que é

A Agenda é o calendário de agendamentos. Mostra os serviços programados para clientes em cada horário.

### Como acessar

Menu superior → **Agenda**.

### Visualizações disponíveis

Você pode alternar entre:
- **Dia** — só o dia atual, com horários detalhados
- **Semana** — semana inteira em colunas
- **Mês** — visão mensal

Use os botões no topo da Agenda para alternar.

### Como criar um agendamento

1. Clique em **+ Novo agendamento** ou em um horário vazio do calendário
2. Preencha:
   - **Cliente** (selecione ou crie um novo)
   - **Telefone**
   - **Placa** e **Veículo** (se relevante)
   - **Serviço**
   - **Título** do agendamento
   - **Data e hora de início**
   - **Data e hora de fim** (ou duração em minutos)
   - **Valor** estimado
   - **Cor** (para identificar visualmente no calendário)
   - **Observações**
3. Salve

### Como editar um agendamento

1. Clique sobre o agendamento no calendário
2. Faça alterações no painel
3. Salve

Você também pode arrastar o agendamento para mover de horário (em algumas visualizações).

### Como excluir um agendamento

1. Abra o agendamento
2. Clique em **Excluir**
3. Confirme

### Status do agendamento

- **Pendente** — agendado mas não confirmado
- **Confirmado** — cliente confirmou
- **Em andamento** — serviço sendo executado
- **Concluído** — serviço finalizado
- **Cancelado** — desmarcado

Atualize o status conforme avança o atendimento.

### Cores no calendário

Cada agendamento tem uma cor escolhida ao criar. Use cores diferentes para:
- Tipo de serviço (azul = lavagem, verde = polimento)
- Funcionário responsável
- Status

### Vínculo com vendas

- Toda **venda** criada gera automaticamente um agendamento (mesmo dia ou data futura)
- Todo **agendamento** pode virar venda — basta capturar pagamento direto dele

Isso garante que vendas e agenda fiquem sincronizadas.

### Como capturar pagamento direto de um agendamento

1. Abra o agendamento
2. Clique em **Capturar pagamento**
3. O sistema cria a venda automaticamente e registra o pagamento

### Lembretes / notificações

Atualmente o sistema não envia lembretes automáticos por SMS/WhatsApp. Mas a Vitrine Digital faz o cliente agendar online e o sistema avisa você. Veja **Vitrine Digital**.

### Como evitar conflitos de horário

O sistema não bloqueia agendamentos sobrepostos automaticamente. Você precisa verificar visualmente no calendário antes de marcar. Para múltiplos profissionais, use cores diferentes por colaborador.

### Posso filtrar a agenda por colaborador/serviço?

A visão padrão mostra tudo. Para filtrar por algum critério específico, use a busca no topo da página de Agenda.

### Bloquear horário (almoço, folga)

Crie um agendamento com nome "Almoço" / "Bloqueado" e a duração desejada, com cor diferente. Não há tipo dedicado a "bloqueio" hoje.

---

## Checklists

### O que é

Checklist é o documento de inspeção do veículo na entrada. Registra estado da pintura, batidas, riscos, condição interna e tira fotos. Protege você e o cliente em caso de divergência depois.

### Quando usar

- Na entrada do veículo na oficina
- Antes de iniciar serviços
- Para entregar com transparência o estado anterior

### Como criar um checklist

Há duas formas:

#### A) Checklist embutido na venda
1. Ao criar/editar uma venda, marque **Adicionar checklist**
2. Preencha os itens (descrito abaixo)
3. Salve junto com a venda

#### B) Checklist standalone (em desenvolvimento — verificar disponibilidade)
Acessível pelo menu/área dedicada quando habilitado.

### O que vai no checklist

#### Dados gerais
- **Placa**
- **Nome do cliente**
- **Telefone**
- **Data e hora**
- **Serviço solicitado**
- **Valor**

#### Condição do veículo
- **Estado da pintura** (ótimo / bom / regular / ruim)
- **KM do veículo**
- **Lavador responsável**
- **Técnico polidor**
- **Data de entrada na loja**
- **Data de entrada na oficina**
- **Data de saída da oficina**

#### Itens de inspeção (padrão)
1. Batidas
2. Riscos profundos
3. Amassados
4. Retoques
5. Micro média
6. Km total
7. Condição interna

Para cada item, você pode:
- Adicionar **observação** (descrever o que viu)
- Marcar a posição no esquema do veículo (clique no mapa)
- Tirar **fotos** de evidência

### Fotos do checklist

Cada item pode ter várias fotos. Recomendado tirar:
- 4 fotos do veículo inteiro (frente, traseira, laterais)
- Foto específica de cada problema notável
- KM no painel
- Detalhes internos relevantes

⚠️ **Atenção**: fotos de checklist têm prazo de retenção (15 dias por padrão). Para histórico longo, salve cópias localmente ou anexe ao cadastro do cliente/veículo.

### Status do checklist

- **Pendente** — criado mas não inspecionado
- **Em andamento** — inspeção em curso
- **Concluído** — finalizado, pode ser entregue

### Como editar um checklist

1. Abra o checklist
2. Adicione/altere observações e fotos
3. Salve

### Como gerar PDF do checklist para o cliente

Após concluído, há botão **Gerar PDF**. O PDF tem todos os dados, fotos e itens marcados, com identidade visual da empresa.

### Posso usar o checklist no celular?

Sim. A interface foi desenhada para uso em celular/tablet, com opção de tirar fotos diretamente da câmera.

### Quanto tempo o checklist fica salvo?

- **Dados**: 180 dias por padrão
- **Fotos**: 15 dias por padrão (após esse prazo, são removidas para liberar armazenamento)

Para guardar histórico permanente, baixe o PDF e arquive externamente.

### O cliente recebe o checklist?

Você gera o PDF e envia (WhatsApp, email). O sistema não envia automaticamente.

---

## Kanban (Quadro de Etapas)

### O que é

Kanban é uma visualização em colunas que mostra em qual etapa cada serviço está, do orçamento até a entrega. Você arrasta cards entre colunas conforme avança.

### Etapas do Kanban

1. **Orçamento** — proposta sendo negociada
2. **Agendado** — cliente confirmou, vai trazer o veículo
3. **Na oficina** — veículo já entrou
4. **Em andamento** — serviço sendo executado
5. **Finalizado** — serviço pronto, aguardando retirada
6. **Entregue** — cliente retirou

### Como acessar

Geralmente acessível pela tela de **Vendas** ou **Agenda** (depende da versão). Procure pelo botão de visualização em colunas.

### Como mover um card de etapa

Arraste o card de uma coluna para outra. O sistema atualiza automaticamente o status do agendamento/venda.

### De onde vêm os cards do Kanban

Os cards podem vir de 3 origens:
- **Orçamento** (origem: prevenda) — orçamento criado
- **Agendamento** — agendamento criado pela agenda ou vitrine
- **Manual** — você cria direto no Kanban

### Como criar um card manualmente

1. Na coluna desejada, clique em **+ Adicionar**
2. Preencha:
   - Nome do cliente
   - Telefone
   - Placa e veículo
   - Serviço
   - Valor
   - Observações
3. Salve

### Posso editar um card?

Sim. Clique sobre o card e edite os campos no painel.

### Como excluir um card

Abra o card e clique em **Excluir**.

### O Kanban substitui a Agenda?

Não, complementa. A Agenda é a visão temporal (calendário); o Kanban é a visão de fluxo de trabalho (em qual etapa está cada veículo).

### Quem deve usar o Kanban

- Equipe de oficina (acompanhar produção)
- Gerente (ver gargalos no fluxo)
- Atendentes (ver o que precisa ser entregue hoje)

### Posso filtrar o Kanban

Há filtros por colaborador, busca por nome/placa, e período. Verifique a interface.

### Notificações de mudança de etapa

Atualmente sem notificações automáticas. A movimentação fica visível para todos da equipe que veem o módulo.
