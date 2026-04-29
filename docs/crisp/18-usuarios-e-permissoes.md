# Usuários e Permissões

## O que é

O módulo Usuários permite criar acessos para a equipe. Cada sub-usuário tem login próprio e permissões personalizadas — você decide quais módulos ele pode ver e editar.

## Como acessar

Menu superior → **Usuários**.

## Diferença: Titular vs Sub-usuário

- **Titular** (você, dono da conta): acesso total, paga a assinatura
- **Sub-usuário**: funcionário que você cadastra, com permissões limitadas

## Roles (perfis pré-definidos)

Para facilitar, há 4 perfis prontos:

### Administrador
Acesso a todos os módulos com permissão de editar. Praticamente igual ao titular, mas não pode mexer em assinatura/conta.

### Gerente
Acesso a quase tudo, geralmente sem mexer em Configurações e Usuários. Pode ver financeiro completo.

### Operador
Acesso operacional: Vendas, Agenda, Clientes, Checklists. Não vê financeiro completo nem configurações.

### Visualizador
Só consulta — não pode criar/editar/excluir nada. Útil para sócios que querem acompanhar.

## Como criar um sub-usuário

1. Em **Usuários**, clique em **+ Novo usuário**
2. Preencha:
   - **Nome**
   - **Email** (será o login)
   - **Senha** (você define ou cliente recebe convite)
   - **Cargo** (texto livre — gerente, atendente, etc.)
   - **Role** (administrador, gerente, operador ou visualizador)
   - **Ativo** (sim/não)
3. Configure as **permissões por módulo**:
   - Para cada módulo (Painel, Vendas, Agenda, Clientes, Checklists, Financeiro, Serviços, Configurações, Usuários):
     - **Ver** (sim/não) — mostra/esconde no menu
     - **Editar** (sim/não) — permite ou não criar/alterar/excluir
4. Salve

## Como editar permissões depois

1. Abra o sub-usuário
2. Ajuste módulos e permissões
3. Salve

A próxima vez que ele logar, terá as novas permissões.

## Como inativar um sub-usuário

1. Abra o cadastro
2. Marque **Ativo = não**
3. Salve

O usuário não consegue mais logar, mas o cadastro fica preservado.

## Como excluir um sub-usuário

1. Abra o cadastro
2. Clique em **Excluir**
3. Confirme

Histórico de ações dele é mantido (vendas, agendamentos), apenas o login some.

## Resetar senha de sub-usuário

1. Abra o cadastro do sub-usuário
2. Edite o campo **Senha**
3. Salve
4. Comunique a nova senha ao funcionário

(O sub-usuário também pode usar "Esqueci minha senha" na tela de login.)

## Quantos sub-usuários posso ter?

Depende do plano contratado. Verifique sua assinatura.

## Sub-usuário pode criar outros sub-usuários?

Apenas se tiver permissão no módulo **Usuários**. Por padrão, perfil "Administrador" permite, outros não.

## Sub-usuário vê os mesmos dados do titular?

Sim — todos os sub-usuários veem os dados da empresa (do titular). O isolamento é entre empresas diferentes (contas diferentes), não entre usuários da mesma conta.

A diferença está em quais **ações** cada um pode fazer (editar ou só ver).

## Posso restringir um sub-usuário a ver só "suas" vendas?

Atualmente não há filtro automático "só minhas vendas". Quem tem permissão de ver Vendas, vê todas. Use isso no momento de definir quem tem acesso ao módulo.

## Sub-usuário com mais de uma empresa

Cada conta de email = uma identidade. Para um funcionário trabalhar em duas empresas, ele precisa de emails diferentes em cada cadastro de sub-usuário.
