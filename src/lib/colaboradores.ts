import type { Colaborador } from '../types'

// =====================================================================
// Cálculo de custo mensal estimado de um colaborador
// =====================================================================
// Regime tributário default = 'simples_nacional' (Entrega 3 trará config)
// - CLT Simples: base + FGTS 8% + provisão 13º (1/12) + provisão férias (11,1%) + benefícios
// - CLT fora do Simples: acima + INSS patronal 20% + RAT 2% + Sistema S 5,8%
// - PJ: base pura (sem encargos)
// - Autônomo: base + ISS retido %

export type RegimeTributario = 'simples_nacional' | 'lucro_presumido' | 'lucro_real'

export interface ItemCusto {
  label: string
  valor: number
  percentual?: number
  descricao: string
}

export interface CustoMensal {
  total: number
  itens: ItemCusto[]
}

export function calcularCustoMensal(
  colaborador: Colaborador,
  regime: RegimeTributario = 'simples_nacional'
): CustoMensal {
  const { tipo, salario } = colaborador
  const itens: ItemCusto[] = []

  if (tipo === 'clt') {
    const base = salario || 0
    itens.push({ label: 'Salário bruto', valor: base, descricao: 'Valor registrado em carteira' })

    // FGTS — 8% sempre
    const fgts = base * 0.08
    itens.push({ label: 'FGTS', valor: fgts, percentual: 8, descricao: '8% sobre salário bruto' })

    // Provisão 13º — 1/12 do salário
    const prov13 = base / 12
    itens.push({ label: 'Provisão 13º', valor: round(prov13), percentual: 8.33, descricao: '1/12 do salário por mês' })

    // Provisão férias — 11,1% (1/12 + 1/3 do 1/12)
    const provFerias = base * 0.111
    itens.push({ label: 'Provisão férias', valor: round(provFerias), percentual: 11.1, descricao: '1/12 + 1/3 constitucional' })

    // Encargos fora do Simples
    if (regime !== 'simples_nacional') {
      const inssPatronal = base * 0.20
      itens.push({ label: 'INSS patronal', valor: round(inssPatronal), percentual: 20, descricao: '20% contribuição patronal' })

      const rat = base * 0.02
      itens.push({ label: 'RAT', valor: round(rat), percentual: 2, descricao: 'Risco Ambiental do Trabalho' })

      const sistemaS = base * 0.058
      itens.push({ label: 'Sistema S', valor: round(sistemaS), percentual: 5.8, descricao: 'SESI/SENAI/SEBRAE/INCRA etc.' })
    }

    // Benefícios
    const vt = colaborador.vale_transporte || 0
    const va = colaborador.vale_alimentacao || 0
    const ps = colaborador.plano_saude || 0
    const outros = colaborador.outros_beneficios || 0
    const totalBeneficios = vt + va + ps + outros
    if (totalBeneficios > 0) {
      if (vt > 0) itens.push({ label: 'Vale transporte', valor: vt, descricao: 'Custo empregador' })
      if (va > 0) itens.push({ label: 'Vale alimentação', valor: va, descricao: 'Custo empregador' })
      if (ps > 0) itens.push({ label: 'Plano de saúde', valor: ps, descricao: 'Custo empregador' })
      if (outros > 0) itens.push({ label: 'Outros benefícios', valor: outros, descricao: 'Benefícios adicionais' })
    }

  } else if (tipo === 'freelancer_pj') {
    const base = salario || 0
    itens.push({ label: 'Valor mensal PJ', valor: base, descricao: 'Nota fiscal do prestador' })

  } else if (tipo === 'freelancer_autonomo') {
    const base = salario || 0
    itens.push({ label: 'Valor base mensal', valor: base, descricao: 'Remuneração acordada' })

    const issPerc = colaborador.iss_retido_percentual || 0
    if (issPerc > 0) {
      const iss = base * (issPerc / 100)
      itens.push({ label: 'ISS retido', valor: round(iss), percentual: issPerc, descricao: `${issPerc}% retido na fonte` })
    }
  }

  const total = round(itens.reduce((acc, i) => acc + i.valor, 0))
  return { total, itens }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
