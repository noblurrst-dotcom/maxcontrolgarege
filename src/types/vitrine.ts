// =====================================================================
// Tipos — Vitrine Digital
// =====================================================================

export interface VitrineConfig {
  user_id?: string
  slug: string
  ativo: boolean
  // Perfil
  nome_empresa: string
  slogan: string
  descricao: string
  logo_url: string
  banner_url: string
  fotos: string[]
  // Contato
  telefone: string
  whatsapp: string
  email: string
  endereco: string
  cidade: string
  estado: string
  // Redes sociais
  instagram_url: string
  facebook_url: string
  tiktok_url: string
  // Agendamento
  aceita_agendamento: boolean
  horario_inicio: string       // 'HH:mm'
  horario_fim: string          // 'HH:mm'
  intervalo_min: number
  dias_semana: number[]        // 0=dom, 6=sab
  antecedencia_max_dias: number
  // Meta
  created_at?: string
  updated_at?: string
}

export const VITRINE_CONFIG_DEFAULT: VitrineConfig = {
  slug: '',
  ativo: true,
  nome_empresa: '',
  slogan: '',
  descricao: '',
  logo_url: '',
  banner_url: '',
  fotos: [],
  telefone: '',
  whatsapp: '',
  email: '',
  endereco: '',
  cidade: '',
  estado: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  aceita_agendamento: true,
  horario_inicio: '08:00',
  horario_fim: '18:00',
  intervalo_min: 30,
  dias_semana: [1, 2, 3, 4, 5, 6],
  antecedencia_max_dias: 30,
}

export interface VitrineServico {
  id: string
  user_id?: string
  servico_id: string
  visivel: boolean
  ordem: number
  preco_vitrine: number | null
  created_at?: string
}

export interface VitrineAgendamento {
  id: string
  user_id: string
  nome_cliente: string
  telefone_cliente: string
  email_cliente: string
  placa: string
  veiculo: string
  servico_id: string
  servico_nome: string
  data_hora: string
  data_hora_fim: string
  duracao_min: number
  valor: number
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
  observacoes: string
  created_at?: string
}
