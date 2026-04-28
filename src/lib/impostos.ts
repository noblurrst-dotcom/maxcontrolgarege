import type { ConfiguracaoImpostos, EstimativaImpostos, ItemImposto } from '../types/impostos'

// =====================================================================
// Calculo de impostos estimados sobre faturamento
// =====================================================================

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcularImpostos(
  faturamento: number,
  config: ConfiguracaoImpostos
): EstimativaImpostos {
  const itens: ItemImposto[] = []

  if (faturamento <= 0) {
    return { total: 0, itens: [], regime: config.regime }
  }

  if (config.regime === 'simples_nacional') {
    const aliq = config.aliquota_simples || 6
    const das = round(faturamento * (aliq / 100))
    itens.push({
      label: 'DAS (Simples Nacional)',
      valor: das,
      percentual: aliq,
      descricao: `${aliq}% sobre faturamento bruto`,
    })
  } else {
    // Lucro Presumido ou Real (simplificado — mesmas aliquotas)
    const pis = round(faturamento * ((config.aliquota_pis || 0.65) / 100))
    const cofins = round(faturamento * ((config.aliquota_cofins || 3) / 100))
    const irpj = round(faturamento * ((config.aliquota_irpj || 4.80) / 100))
    const csll = round(faturamento * ((config.aliquota_csll || 2.88) / 100))
    const iss = round(faturamento * ((config.aliquota_iss || 5) / 100))

    itens.push({
      label: 'PIS',
      valor: pis,
      percentual: config.aliquota_pis || 0.65,
      descricao: 'Programa de Integra\u00e7\u00e3o Social',
    })
    itens.push({
      label: 'COFINS',
      valor: cofins,
      percentual: config.aliquota_cofins || 3,
      descricao: 'Contribui\u00e7\u00e3o p/ Financiamento da Seguridade Social',
    })
    itens.push({
      label: 'IRPJ',
      valor: irpj,
      percentual: config.aliquota_irpj || 4.80,
      descricao: 'Imposto de Renda PJ (base presumida 32%)',
    })
    itens.push({
      label: 'CSLL',
      valor: csll,
      percentual: config.aliquota_csll || 2.88,
      descricao: 'Contribui\u00e7\u00e3o Social sobre Lucro L\u00edquido',
    })
    itens.push({
      label: 'ISS',
      valor: iss,
      percentual: config.aliquota_iss || 5,
      descricao: 'Imposto Sobre Servi\u00e7os',
    })
  }

  const total = round(itens.reduce((a, i) => a + i.valor, 0))
  return { total, itens, regime: config.regime }
}

// Labels amigaveis
export const REGIME_LABEL: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
}
