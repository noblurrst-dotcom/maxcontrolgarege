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
  estado_pintura?: 'otimo' | 'bom' | 'regular' | 'ruim' | null;
  lavador?: string;
  tecnico_polidor?: string;
  data_entrada_loja?: string | null;
  data_entrada_oficina?: string | null;
  data_saida_oficina?: string | null;
  created_at: string;
  expires_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  item_tipo: string | null;
  observacao: string;
  descricao?: string;
  pos_x?: number | null;
  pos_y?: number | null;
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

export type StatusPagamento = 'pendente' | 'parcial' | 'pago' | 'cortesia' | 'cancelada'

export interface Venda {
  id: string;
  user_id: string;
  cliente_id: string | null;
  nome_cliente: string;
  valor: number;
  desconto: number;
  valor_total: number;
  valor_pago: number;
  forma_pagamento: FormaPagamento | null;
  status_pagamento: StatusPagamento;
  descricao: string;
  data_venda: string;
  data_agendamento?: string;
  hora_agendamento?: string;
  status: 'aberta' | 'fechada';
  parcelas: number;
  funcionario: string;                // legacy: texto livre (compat)
  colaborador_id?: string | null;     // FK opcional → funcionarios.id (migration 008+)
  observacoes: string;
  checklist_id: string | null;
  created_at: string;
}

export interface Pagamento {
  id: string;
  user_id: string;
  venda_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  parcelas: number;
  data_pagamento: string;
  observacoes: string;
  financeiro_id: string | null;
  created_at: string;
}

export interface Agendamento {
  id: string;
  user_id: string;
  cliente_id: string | null;
  venda_id?: string | null;
  nome_cliente: string;
  telefone_cliente: string;
  placa?: string;
  veiculo?: string;
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


export interface OrcamentoItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export type StatusOrcamento = 'pendente' | 'aprovado' | 'recusado'

export interface Orcamento {
  id: string;
  user_id: string;
  cliente_id: string | null;
  nome_cliente: string;
  telefone_cliente: string;
  itens: OrcamentoItem[];
  valor_total: number;
  status: StatusOrcamento;
  validade: string;
  observacoes: string;
  checklist_id: string | null;
  created_at: string;
}

/** @deprecated Use OrcamentoItem */
export type PreVendaItem = OrcamentoItem
/** @deprecated Use Orcamento */
export type PreVenda = Orcamento

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
  foto_frente?: string | null;
  foto_traseira?: string | null;
  foto_direita?: string | null;
  foto_esquerda?: string | null;
}

// ============================================================
// Colaborador (CLT, Freelancer PJ, Autônomo)
// ============================================================
export type TipoColaborador = 'clt' | 'freelancer_pj' | 'freelancer_autonomo'

export interface Colaborador {
  id: string;
  user_id: string;
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  cpf_cnpj: string;
  tipo: TipoColaborador;
  data_admissao: string | null;  // ISO date (yyyy-mm-dd) ou null
  ativo: boolean;
  // Pagamento base
  salario: number;                // mensal CLT, ou base mensal PJ/Autônomo
  // CLT-only
  vale_transporte: number;
  vale_alimentacao: number;
  plano_saude: number;
  outros_beneficios: number;
  // Freelancer-only
  valor_servico_padrao: number;
  iss_retido_percentual: number;  // 0-100
  // Comum
  comissao_percentual: number;    // 0-100, aplicado sobre venda atribuída
  observacoes: string;
  created_at: string;
}

/**
 * @deprecated Use `Colaborador`. Mantido como alias para compat com
 * código que eventualmente importe `Funcionario`.
 */
export type Funcionario = Colaborador

// ============================================================
// Pagamento a Colaborador (folha, comissão, bônus)
// ============================================================
export type TipoPagamentoColaborador = 'salario' | 'comissao' | 'bonus' | 'adiantamento' | 'outro'

export interface PagamentoColaborador {
  id: string;
  user_id: string;
  colaborador_id: string;
  tipo: TipoPagamentoColaborador;
  valor: number;
  mes_referencia: string;       // 'YYYY-MM'
  data_pagamento: string;       // ISO date
  venda_id?: string | null;     // se comissão, qual venda originou
  observacoes: string;
  created_at: string;
}

export type NaturezaDespesa = 'fixa' | 'variavel'

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
  natureza?: NaturezaDespesa | null;
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

export interface Veiculo {
  id: string
  user_id: string
  cliente_id: string
  placa: string
  modelo: string
  marca: string
  ano: string
  cor: string
  foto_frente?: string | null
  foto_traseira?: string | null
  foto_direita?: string | null
  foto_esquerda?: string | null
  observacoes: string
  created_at: string
}

// Re-export impostos types
export type { RegimeTributario, ConfiguracaoImpostos, ItemImposto, EstimativaImpostos } from './impostos'
export { CONFIG_IMPOSTOS_DEFAULT } from './impostos'

// Re-export vitrine types
export type { VitrineConfig, VitrineServico, VitrineAgendamento } from './vitrine'
export { VITRINE_CONFIG_DEFAULT } from './vitrine'
