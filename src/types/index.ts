export interface Checklist {
  id: string;
  user_id: string;
  placa: string;
  nome_cliente: string;
  telefone_cliente: string;
  data_hora: string;
  servico: string;
  valor: number;
  status: 'pendente' | 'em_andamento' | 'concluido';
  observacoes: string;
  created_at: string;
  expires_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  item_tipo: string;
  observacao: string;
  tem_foto: boolean;
  ordem: number;
}

export interface Foto {
  id: string;
  checklist_id: string;
  item_tipo: string;
  url: string;
  created_at: string;
  expires_at: string;
}

export interface Servico {
  id: string;
  user_id: string;
  nome: string;
  descricao: string;
  preco_padrao: number;
  foto_url: string | null;
  created_at: string;
}

export interface ChecklistServico {
  id: string;
  checklist_id: string;
  servico_id: string;
  quantidade: number;
  created_at: string;
}

export interface ChecklistServicoComServico {
  quantidade: number;
  servicos: Servico;
}

export const CHECKLIST_ITENS_PADRAO = [
  { item_tipo: 'Batidas', ordem: 1 },
  { item_tipo: 'Riscos profundos', ordem: 2 },
  { item_tipo: 'Amassados', ordem: 3 },
  { item_tipo: 'Retoques', ordem: 4 },
  { item_tipo: 'Micra media', ordem: 5 },
  { item_tipo: 'Km total', ordem: 6 },
  { item_tipo: 'Condição interna', ordem: 7 },
] as const;

export interface ChecklistComItens extends Checklist {
  itens: ChecklistItem[];
  fotos: Foto[];
}

export interface NovoChecklistForm {
  placa: string;
  nome_cliente: string;
  telefone_cliente: string;
  servico: string;
  valor: string;
  observacoes: string;
  itens: {
    item_tipo: string;
    observacao: string;
    fotos: File[];
  }[];
}

// === Configuração de Identidade Visual ===

export interface BrandConfig {
  nome_usuario: string;
  nome_empresa: string;
  slogan: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  logo_url: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  pdf_rodape: string;
  pdf_termos: string;
  pdf_mostrar_logo: boolean;
  pdf_mostrar_dados: boolean;
}

// === Entidades do Sistema ===

export type FormaPagamento = 'debito' | 'credito' | 'pix' | 'dinheiro' | 'boleto' | 'transferencia'

export interface Venda {
  id: string;
  user_id: string;
  cliente_id: string | null;
  nome_cliente: string;
  valor: number;
  desconto: number;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  descricao: string;
  data_venda: string;
  data_agendamento?: string;
  hora_agendamento?: string;
  status: 'aberta' | 'fechada';
  parcelas: number;
  funcionario: string;
  observacoes: string;
  created_at: string;
}

export interface Agendamento {
  id: string;
  user_id: string;
  cliente_id: string | null;
  venda_id?: string | null;
  nome_cliente: string;
  telefone_cliente: string;
  servico: string;
  titulo: string;
  data_hora: string;
  data_hora_fim: string;
  duracao_min: number;
  status: 'pendente' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado';
  observacoes: string;
  desconto: number;
  valor: number;
  cor?: string;
  created_at: string;
}


export interface PreVendaItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export interface PreVenda {
  id: string;
  user_id: string;
  cliente_id: string | null;
  nome_cliente: string;
  telefone_cliente: string;
  itens: PreVendaItem[];
  valor_total: number;
  status: 'pendente' | 'aprovado' | 'recusado';
  validade: string;
  observacoes: string;
  created_at: string;
}

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf_cnpj: string;
  veiculo: string;
  placa: string;
  endereco: string;
  aniversario: string;
  observacoes: string;
  total_gasto: number;
  created_at: string;
}

export interface Funcionario {
  id: string;
  user_id: string;
  nome: string;
  cargo: string;
  telefone: string;
  salario: number;
  ativo: boolean;
  created_at: string;
}

export interface ContaFinanceira {
  id: string;
  user_id: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  pago: boolean;
  conta_bancaria: string;
  forma_pagamento: FormaPagamento | '';
  created_at: string;
}

// === Sub-Usuários e Permissões ===

export type ModuloId = 'dashboard' | 'vendas' | 'agenda' | 'clientes' | 'checklists' | 'financeiro' | 'servicos' | 'configuracoes' | 'usuarios'

export interface ModuloPermissao {
  modulo: ModuloId
  ver: boolean
  editar: boolean
}

export interface SubUsuario {
  id: string
  owner_id: string
  nome: string
  email: string
  senha: string
  cargo: string
  ativo: boolean
  role: 'admin' | 'gerente' | 'operador' | 'visualizador'
  permissoes: ModuloPermissao[]
  created_at: string
  updated_at: string
}

export const MODULOS_DISPONIVEIS: { id: ModuloId; label: string }[] = [
  { id: 'dashboard', label: 'Painel' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'configuracoes', label: 'Configurações' },
  { id: 'usuarios', label: 'Usuários' },
]

export const ROLES_LABELS: Record<SubUsuario['role'], string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  operador: 'Operador',
  visualizador: 'Visualizador',
}

export type KanbanEtapa = 'orcamento' | 'agendado' | 'na_oficina' | 'em_andamento' | 'finalizado' | 'entregue'

export interface KanbanItem {
  id: string;
  user_id: string;
  etapa: KanbanEtapa;
  nome_cliente: string;
  telefone_cliente: string;
  placa: string;
  veiculo: string;
  servico: string;
  valor: number;
  observacoes: string;
  origem_tipo: 'prevenda' | 'agendamento' | 'manual';
  origem_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContaBancaria {
  id: string;
  user_id: string;
  nome: string;
  banco: string;
  saldo: number;
  tipo: 'corrente' | 'poupanca' | 'carteira';
  ativo: boolean;
  created_at: string;
}



