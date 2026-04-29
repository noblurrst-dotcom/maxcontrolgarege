# Colaboradores

## O que é

Cadastro da equipe que trabalha na empresa. Suporta três tipos de regime: CLT, Freelancer PJ e Freelancer Autônomo. Cada tipo tem campos específicos.

## Como acessar

Menu superior → **Colaboradores** (ou similar). Em algumas instalações fica dentro de Configurações.

## Tipos de colaborador

### CLT (Consolidação das Leis do Trabalho)
Funcionário registrado em carteira. Campos específicos:
- **Salário** (mensal)
- **Vale transporte**
- **Vale alimentação**
- **Plano de saúde**
- **Outros benefícios**

### Freelancer PJ (Pessoa Jurídica)
Prestador de serviço com CNPJ. Campos específicos:
- **Valor de serviço padrão**
- **ISS retido (%)** — percentual de imposto retido na fonte
- **Salário/base mensal** (opcional)

### Freelancer Autônomo
Prestador sem CNPJ. Campos específicos:
- **Valor de serviço padrão**
- **ISS retido (%)** (se aplicável)

## Como cadastrar um colaborador

1. Clique em **+ Novo colaborador**
2. Selecione o **Tipo** (CLT, PJ ou Autônomo)
3. Preencha:
   - **Nome**
   - **Cargo** (lavador, polidor, atendente, gerente, etc.)
   - **Telefone**
   - **Email**
   - **CPF/CNPJ**
   - **Data de admissão**
   - **Ativo** (sim/não)
4. Conforme o tipo, preencha os campos de pagamento
5. Defina **Comissão (%)** — percentual aplicado sobre vendas atribuídas a ele
6. **Observações**
7. Salve

## Comissão sobre vendas

Cada colaborador pode ter um percentual de comissão. Quando você cria uma venda e seleciona o colaborador, o sistema pode calcular automaticamente o valor da comissão para a folha.

Exemplo:
- Colaborador: João, comissão 10%
- Venda atribuída a ele: R$ 500
- Comissão devida: R$ 50

Os pagamentos de comissão são lançados em **Pagamentos a Colaboradores**.

## Como atribuir um colaborador a uma venda

Ao criar/editar uma venda, há campo **Colaborador**. Selecione quem executou. Isso vincula a venda ao colaborador para fins de comissão.

## Ativar/Inativar colaborador

Em vez de excluir, marque como **Inativo**. Isso preserva o histórico mas tira da lista de seleção em novas vendas.

## Como editar um colaborador

Clique sobre o nome → ajuste campos → salve.

## Como excluir um colaborador

⚠️ Recomendamos **inativar** em vez de excluir, para manter o histórico de pagamentos antigos. Para excluir definitivamente:
1. Abra o cadastro
2. Clique em **Excluir**
3. Confirme

## Posso ter colaboradores com múltiplos cargos?

Cada cadastro tem um cargo. Para alguém que faz várias funções, escolha o principal ou cadastre o cargo como "Multifuncional / Lavador e Polidor".

## Folha de pagamento

Para registrar pagamentos (salário, comissão, bônus, adiantamento), use **Pagamentos a Colaboradores**. Veja o tópico próprio.

## Sub-usuário vs Colaborador

São coisas diferentes:
- **Colaborador**: pessoa física, registrada para folha de pagamento e atribuição de vendas
- **Sub-usuário**: acesso ao sistema (login), com permissões em módulos

Um colaborador pode (ou não) também ter login no sistema. São cadastros separados em **Usuários**.
