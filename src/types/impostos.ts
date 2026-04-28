export type RegimeTributario = 'simples_nacional' | 'lucro_presumido' | 'lucro_real'

export interface ConfiguracaoImpostos {
  user_id?: string
  regime: RegimeTributario
  aliquota_simples: number       // % ex: 6.00
  aliquota_pis: number           // % ex: 0.65
  aliquota_cofins: number        // % ex: 3.00
  aliquota_irpj: number          // % ex: 4.80
  aliquota_csll: number          // % ex: 2.88
  aliquota_iss: number           // % ex: 5.00
  observacoes: string
  updated_at?: string
}

export const CONFIG_IMPOSTOS_DEFAULT: ConfiguracaoImpostos = {
  regime: 'simples_nacional',
  aliquota_simples: 6.00,
  aliquota_pis: 0.65,
  aliquota_cofins: 3.00,
  aliquota_irpj: 4.80,
  aliquota_csll: 2.88,
  aliquota_iss: 5.00,
  observacoes: '',
}

export interface ItemImposto {
  label: string
  valor: number
  percentual: number
  descricao: string
}

export interface EstimativaImpostos {
  total: number
  itens: ItemImposto[]
  regime: RegimeTributario
}
