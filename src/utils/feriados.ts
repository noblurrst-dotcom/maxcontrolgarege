export interface Feriado {
  data: string // MM-DD
  nome: string
  tipo: 'nacional' | 'regional'
}

export const FERIADOS_FIXOS: Feriado[] = [
  // Nacionais
  { data: '01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { data: '04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { data: '05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { data: '09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { data: '10-12', nome: 'Nossa Sra. Aparecida', tipo: 'nacional' },
  { data: '11-02', nome: 'Finados', tipo: 'nacional' },
  { data: '11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { data: '11-20', nome: 'Consciência Negra', tipo: 'nacional' },
  { data: '12-25', nome: 'Natal', tipo: 'nacional' },
  // Regionais / pontos facultativos comuns
  { data: '01-25', nome: 'Aniversário de São Paulo', tipo: 'regional' },
  { data: '03-08', nome: 'Dia Internacional da Mulher', tipo: 'regional' },
  { data: '06-12', nome: 'Dia dos Namorados', tipo: 'regional' },
  { data: '06-24', nome: 'São João', tipo: 'regional' },
  { data: '07-09', nome: 'Revolução Constitucionalista (SP)', tipo: 'regional' },
  { data: '07-26', nome: 'Dia dos Avós', tipo: 'regional' },
  { data: '08-11', nome: 'Dia dos Pais', tipo: 'regional' },
  { data: '10-15', nome: 'Dia do Professor', tipo: 'regional' },
  { data: '10-31', nome: 'Dia do Saci / Halloween', tipo: 'regional' },
  { data: '12-24', nome: 'Véspera de Natal', tipo: 'regional' },
  { data: '12-31', nome: 'Véspera de Ano Novo', tipo: 'regional' },
]

// Páscoa via algoritmo de Meeus
export function calcularPascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

export function getFeriadosMoveis(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano)
  const d = (offset: number) => {
    const dt = new Date(pascoa)
    dt.setDate(dt.getDate() + offset)
    return `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }
  return [
    { data: d(-47), nome: 'Carnaval (terça)', tipo: 'nacional' },
    { data: d(-48), nome: 'Carnaval (segunda)', tipo: 'nacional' },
    { data: d(-2), nome: 'Sexta-feira Santa', tipo: 'nacional' },
    { data: d(0), nome: 'Páscoa', tipo: 'nacional' },
    { data: d(60), nome: 'Corpus Christi', tipo: 'nacional' },
  ]
}

export function getFeriadosDoAno(ano: number): Feriado[] {
  return [...FERIADOS_FIXOS, ...getFeriadosMoveis(ano)]
}

export function getFeriadoDoDia(dia: Date, feriados: Feriado[]): Feriado | undefined {
  const chave = `${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
  return feriados.find(f => f.data === chave)
}
