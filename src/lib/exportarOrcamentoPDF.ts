import type { Orcamento, Servico } from '../types'

// Paleta A.T.A Gestão — fixa, sem customização por tenant.
const COR_PRIMARIA = '#3657A3'
const COR_SECUNDARIA = '#1a1a2e'

interface BrandConfig {
  nome_empresa: string
  logo_url?: string
  telefone?: string
  endereco?: string
  cnpj?: string
  slogan?: string
}

interface DefeitoDetalhado {
  x: number
  y: number
  descricao: string
  fotos: string[] // URLs ou data URLs
}

interface FotosVeiculo {
  frente: string | null
  traseira: string | null
  direita: string | null
  esquerda: string | null
}

interface DadosOrcamento {
  orcamento: Orcamento
  servicos: Servico[]
  brand: BrandConfig
  tipo?: 'orcamento' | 'venda'
  marcacoesDefeitos?: { x: number; y: number }[]
  defeitosDetalhados?: DefeitoDetalhado[]
  fotosVeiculo?: FotosVeiculo
  kmVeiculo?: number
  estadoPintura?: 'otimo' | 'bom' | 'regular' | 'ruim'
  lavador?: string
  tecnicoPolidor?: string
  dataEntradaLoja?: string
  dataEntradaOficina?: string
  dataSaidaOficina?: string
  observacoes?: string
}

export async function exportarOrcamentoPDF(dados: DadosOrcamento): Promise<void> {
  const { orcamento, servicos, brand, tipo = 'orcamento', marcacoesDefeitos = [],
    defeitosDetalhados = [],
    fotosVeiculo,
    kmVeiculo,
    estadoPintura, lavador, tecnicoPolidor,
    dataEntradaLoja, dataEntradaOficina, dataSaidaOficina,
    observacoes } = dados
  const labelTipo = tipo === 'venda' ? 'VENDA' : 'ORÇAMENTO'

  // Carrega jsPDF apenas quando o usuário gera um PDF (lazy)
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()

  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }

  const corPri = hexToRgb(COR_PRIMARIA)
  const corSec = hexToRgb(COR_SECUNDARIA)
  const margin = 12
  let y = margin

  // ── CABEÇALHO ──
  doc.setFillColor(corSec.r, corSec.g, corSec.b)
  doc.rect(0, 0, pw, 35, 'F')

  if (brand.logo_url) {
    try {
      const resp = await fetch(brand.logo_url)
      const blob = await resp.blob()
      const base64 = await new Promise<string>((res) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result as string)
        reader.readAsDataURL(blob)
      })
      doc.addImage(base64, 'PNG', margin, 5, 25, 25)
    } catch { /* ignora erro de logo */ }
  }

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corPri.r, corPri.g, corPri.b)
  doc.text(brand.nome_empresa || 'Minha Empresa', brand.logo_url ? margin + 28 : margin, 16)

  if (brand.slogan) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 200, 200)
    doc.text(brand.slogan, brand.logo_url ? margin + 28 : margin, 22)
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corPri.r, corPri.g, corPri.b)
  doc.text(`CHECK LIST / ${labelTipo}`, pw - margin, 13, { align: 'right' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  if (brand.telefone) doc.text(brand.telefone, pw - margin, 19, { align: 'right' })
  if (brand.cnpj) doc.text(`CNPJ: ${brand.cnpj}`, pw - margin, 24, { align: 'right' })

  y = 40

  // ── DADOS DO CLIENTE ──
  doc.setDrawColor(corPri.r, corPri.g, corPri.b)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pw - margin, y)
  y += 5

  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text('CLIENTE', margin, y)
  doc.text('TELEFONE', pw / 2 + 2, y)
  y += 4

  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text(orcamento.nome_cliente || '—', margin, y)
  doc.text(orcamento.telefone_cliente || '—', pw / 2 + 2, y)
  y += 2

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y + 2, pw / 2 - 2, y + 2)
  doc.line(pw / 2 + 2, y + 2, pw - margin, y + 2)
  y += 8

  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text('VEÍCULO / SERVIÇO', margin, y)
  doc.text(`NÚMERO DO ${labelTipo}`, pw / 2 + 2, y)
  y += 4

  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  const descServicos = orcamento.itens.map(i => i.descricao).filter(Boolean).join(', ')
  doc.text(descServicos.substring(0, 45) || '—', margin, y)
  doc.text(`#${orcamento.id.slice(0, 8).toUpperCase()}`, pw / 2 + 2, y)
  y += 2
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y + 2, pw / 2 - 2, y + 2)
  doc.line(pw / 2 + 2, y + 2, pw - margin, y + 2)
  y += 10

  // ── SERVIÇOS ──
  doc.setFillColor(corSec.r, corSec.g, corSec.b)
  doc.rect(margin, y, pw - margin * 2, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corPri.r, corPri.g, corPri.b)
  doc.text('• SERVIÇOS', margin + 3, y + 4)
  y += 9

  const servicosSelecionados = new Set(
    orcamento.itens.map(i => i.descricao.toLowerCase().trim())
  )

  const colW = (pw - margin * 2) / 3
  const servicosPorColuna = Math.ceil(servicos.length / 3)
  const colunas = [
    servicos.slice(0, servicosPorColuna),
    servicos.slice(servicosPorColuna, servicosPorColuna * 2),
    servicos.slice(servicosPorColuna * 2),
  ]

  const colTitulos = ['LIMPEZA E CORREÇÕES', 'PROTEÇÃO', 'OUTROS SERVIÇOS']
  colunas.forEach((_, ci) => {
    const cx = margin + ci * colW
    doc.setFillColor(corPri.r, corPri.g, corPri.b)
    doc.rect(cx, y, colW - 1, 5, 'F')
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(corSec.r, corSec.g, corSec.b)
    doc.text(colTitulos[ci] || 'SERVIÇOS', cx + 2, y + 3.5)
  })
  y += 7

  const yInicioServicos = y
  let maxLinhas = 0

  colunas.forEach((lista, ci) => {
    const cx = margin + ci * colW
    let ly = yInicioServicos
    lista.forEach((srv) => {
      const selecionado = servicosSelecionados.has(srv.nome.toLowerCase().trim())
      doc.setDrawColor(150, 150, 150)
      doc.setLineWidth(0.3)
      doc.rect(cx + 1, ly - 2.5, 3, 3)
      if (selecionado) {
        doc.setDrawColor(corPri.r, corPri.g, corPri.b)
        doc.setLineWidth(0.5)
        doc.line(cx + 1.5, ly - 1, cx + 2.5, ly - 0.2)
        doc.line(cx + 2.5, ly - 0.2, cx + 4, ly - 2)
      }
      doc.setFontSize(6.5)
      doc.setFont('helvetica', selecionado ? 'bold' : 'normal')
      doc.setTextColor(selecionado ? corSec.r : 80, selecionado ? corSec.g : 80, selecionado ? corSec.b : 80)
      doc.text(srv.nome.substring(0, 28), cx + 6, ly)
      ly += 5
    })
    maxLinhas = Math.max(maxLinhas, lista.length)
  })

  y = yInicioServicos + maxLinhas * 5 + 5

  // ── DIAGRAMA DO CARRO ──
  doc.setFillColor(corSec.r, corSec.g, corSec.b)
  doc.rect(margin, y, pw - margin * 2, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corPri.r, corPri.g, corPri.b)
  doc.text('• IDENTIFICAÇÃO DE DEFEITOS', margin + 3, y + 4)
  y += 8

  const diagramaH = 45
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, pw - margin * 2, diagramaH)

  const dx = pw / 2
  const dy = y + diagramaH / 2

  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.5)
  doc.setFillColor(240, 240, 240)
  doc.roundedRect(dx - 18, dy - 22, 36, 44, 4, 4, 'FD')

  doc.setFillColor(200, 220, 240)
  doc.roundedRect(dx - 13, dy - 20, 26, 10, 2, 2, 'FD')
  doc.roundedRect(dx - 13, dy + 10, 26, 10, 2, 2, 'FD')

  doc.setFillColor(60, 60, 60)
  doc.ellipse(dx - 20, dy - 15, 3, 4, 'F')
  doc.ellipse(dx + 20, dy - 15, 3, 4, 'F')
  doc.ellipse(dx - 20, dy + 15, 3, 4, 'F')
  doc.ellipse(dx + 20, dy + 15, 3, 4, 'F')

  doc.setFontSize(6)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text('FRENTE', dx, y + 3, { align: 'center' })
  doc.text('TRASEIRA', dx, y + diagramaH - 2, { align: 'center' })
  doc.text('ESQ', margin + 3, dy, { align: 'left' })
  doc.text('DIR', pw - margin - 3, dy, { align: 'right' })

  // Se temos defeitos detalhados, usa eles (numerados); caso contrário, fallback para marcacoesDefeitos
  const pontosNumerados = defeitosDetalhados.length > 0
    ? defeitosDetalhados.map((d, i) => ({ x: d.x, y: d.y, n: i + 1 }))
    : marcacoesDefeitos.map((p, i) => ({ x: p.x, y: p.y, n: i + 1 }))

  if (pontosNumerados.length > 0) {
    doc.setFillColor(239, 68, 68)
    doc.setDrawColor(220, 38, 38)
    pontosNumerados.forEach(ponto => {
      const px = margin + ponto.x * (pw - margin * 2)
      const py = y + ponto.y * diagramaH
      doc.circle(px, py, 2.5, 'FD')
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(String(ponto.n), px, py + 1.5, { align: 'center' })
    })
  }

  y += diagramaH + 5

  // ── FOTOS DO VEÍCULO (4 lados) + KM ──
  const temAlgumaFoto = fotosVeiculo && (fotosVeiculo.frente || fotosVeiculo.traseira || fotosVeiculo.direita || fotosVeiculo.esquerda)
  if (temAlgumaFoto || kmVeiculo) {
    if (y > ph - 60) { doc.addPage(); y = margin }
    doc.setFillColor(corSec.r, corSec.g, corSec.b)
    doc.rect(margin, y, pw - margin * 2, 6, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(corPri.r, corPri.g, corPri.b)
    const tituloFotos = kmVeiculo ? `• FOTOS DO VEÍCULO   |   KM: ${kmVeiculo.toLocaleString('pt-BR')}` : '• FOTOS DO VEÍCULO'
    doc.text(tituloFotos, margin + 3, y + 4)
    y += 9

    if (temAlgumaFoto && fotosVeiculo) {
      // Grid 2x2 de fotos
      const fotoW = (pw - margin * 2 - 4) / 2
      const fotoH = 30
      const itens = [
        { label: 'Frente',   url: fotosVeiculo.frente,   col: 0, row: 0 },
        { label: 'Traseira', url: fotosVeiculo.traseira, col: 1, row: 0 },
        { label: 'Esquerda', url: fotosVeiculo.esquerda, col: 0, row: 1 },
        { label: 'Direita',  url: fotosVeiculo.direita,  col: 1, row: 1 },
      ]
      itens.forEach(({ label, url, col, row }) => {
        const fx = margin + col * (fotoW + 4)
        const fy = y + row * (fotoH + 8)
        // Caixa com label
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.rect(fx, fy, fotoW, fotoH)
        if (url) {
          try {
            doc.addImage(url, 'JPEG', fx + 0.5, fy + 0.5, fotoW - 1, fotoH - 1, undefined, 'FAST')
          } catch {
            doc.setFontSize(7); doc.setTextColor(180, 180, 180)
            doc.text('(falha imagem)', fx + fotoW / 2, fy + fotoH / 2, { align: 'center' })
          }
        } else {
          doc.setFontSize(7); doc.setTextColor(180, 180, 180); doc.setFont('helvetica', 'normal')
          doc.text('(sem foto)', fx + fotoW / 2, fy + fotoH / 2, { align: 'center' })
        }
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
        doc.text(label, fx + fotoW / 2, fy + fotoH + 4, { align: 'center' })
      })
      y += fotoH * 2 + 16
    } else {
      y += 2
    }
  }

  // ── DESCRIÇÃO DOS DEFEITOS (se detalhados) ──
  if (defeitosDetalhados.length > 0) {
    if (y > ph - 50) { doc.addPage(); y = margin }
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('DETALHES DOS DEFEITOS', margin, y)
    y += 4

    for (let i = 0; i < defeitosDetalhados.length; i++) {
      const d = defeitosDetalhados[i]
      const desc = d.descricao || '(sem descrição)'
      const linhasDesc = doc.splitTextToSize(`${i + 1}. ${desc}`, pw - margin * 2 - (d.fotos.length > 0 ? 22 : 0))
      const alturaLinhas = linhasDesc.length * 3.5
      const alturaCard = Math.max(alturaLinhas + 2, d.fotos.length > 0 ? 20 : 6)

      if (y + alturaCard > ph - 25) { doc.addPage(); y = margin }

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      doc.text(linhasDesc, margin, y + 3)

      // Render até 1 foto inline (thumbnail à direita)
      if (d.fotos.length > 0) {
        try {
          const fotoUrl = d.fotos[0]
          // tenta adicionar como imagem (PNG/JPEG); se falhar, ignora
          doc.addImage(fotoUrl, 'JPEG', pw - margin - 18, y, 18, 18, undefined, 'FAST')
          if (d.fotos.length > 1) {
            doc.setFontSize(6)
            doc.setTextColor(120, 120, 120)
            doc.text(`+${d.fotos.length - 1}`, pw - margin - 9, y + 21, { align: 'center' })
          }
        } catch {
          // imagem inválida, segue sem
        }
      }
      y += alturaCard + 2
    }
    y += 2
  }

  // ── ESTADO DA PINTURA ──
  doc.setFillColor(corSec.r, corSec.g, corSec.b)
  doc.rect(margin, y, pw - margin * 2, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corPri.r, corPri.g, corPri.b)
  doc.text('• ESTADO DA PINTURA', margin + 3, y + 4)
  y += 9

  const barW = pw - margin * 2
  const gradSteps = 40
  for (let i = 0; i < gradSteps; i++) {
    const t = i / gradSteps
    const r = Math.round(0 * (1 - t) + 255 * t)
    const g = Math.round(200 * (1 - t) + 50 * t)
    const b = 0
    doc.setFillColor(r, g, b)
    doc.rect(margin + i * (barW / gradSteps), y, barW / gradSteps + 0.5, 4, 'F')
  }
  y += 6

  const estados = [
    { label: 'Ótimo', value: 'otimo' },
    { label: 'Bom', value: 'bom' },
    { label: 'Regular', value: 'regular' },
    { label: 'Ruim', value: 'ruim' },
  ]
  const estW = (pw - margin * 2) / 4
  estados.forEach((est, i) => {
    const ex = margin + i * estW
    const selecionado = estadoPintura === est.value
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.3)
    doc.rect(ex + 1, y, 4, 4)
    if (selecionado) {
      doc.setFillColor(corPri.r, corPri.g, corPri.b)
      doc.rect(ex + 1.5, y + 0.5, 3, 3, 'F')
    }
    doc.setFontSize(8)
    doc.setFont('helvetica', selecionado ? 'bold' : 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(est.label, ex + 7, y + 3.5)
  })
  y += 10

  // ── CAMPOS OPERACIONAIS ──
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('OBSERVAÇÕES', margin, y)
  y += 2
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, (pw - margin * 2) * 0.55, 16)

  if (observacoes) {
    doc.setFontSize(7)
    doc.setTextColor(50, 50, 50)
    const linhasObs = doc.splitTextToSize(observacoes, (pw - margin * 2) * 0.52)
    doc.text(linhasObs.slice(0, 3), margin + 2, y + 4)
  }

  const rightX = margin + (pw - margin * 2) * 0.58
  const rightW = (pw - margin * 2) * 0.40

  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('LAVADOR', rightX, y)
  doc.rect(rightX, y + 2, rightW, 6)
  if (lavador) {
    doc.setFontSize(8)
    doc.setTextColor(30, 30, 30)
    doc.text(lavador, rightX + 2, y + 6)
  }

  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('TÉCNICO POLIDOR', rightX, y + 10)
  doc.rect(rightX, y + 12, rightW, 6)
  if (tecnicoPolidor) {
    doc.setFontSize(8)
    doc.setTextColor(30, 30, 30)
    doc.text(tecnicoPolidor, rightX + 2, y + 16)
  }

  y += 22

  const dateW = (pw - margin * 2) / 3
  const datas = [
    { label: 'ENTRADA NA LOJA', value: dataEntradaLoja },
    { label: 'ENTRADA NA OFICINA', value: dataEntradaOficina },
    { label: 'SAÍDA DA OFICINA', value: dataSaidaOficina },
  ]
  datas.forEach((d, i) => {
    const dx2 = margin + i * dateW
    doc.setFontSize(6)
    doc.setTextColor(120, 120, 120)
    doc.text(d.label, dx2 + dateW / 2, y, { align: 'center' })
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.3)
    doc.line(dx2 + 2, y + 5, dx2 + dateW - 2, y + 5)
    if (d.value) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text(d.value, dx2 + dateW / 2, y + 4, { align: 'center' })
    }
  })
  y += 12

  // ── RESUMO FINANCEIRO ──
  doc.setFillColor(corSec.r, corSec.g, corSec.b)
  doc.rect(margin, y, pw - margin * 2, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corPri.r, corPri.g, corPri.b)
  doc.text('• RESUMO FINANCEIRO', margin + 3, y + 4)
  y += 9

  orcamento.itens.forEach(item => {
    const sub = item.quantidade * item.valor_unitario
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    doc.text(`${item.descricao} (${item.quantidade}x)`, margin + 2, y)
    doc.text(`R$ ${sub.toFixed(2).replace('.', ',')}`, pw - margin - 2, y, { align: 'right' })
    y += 5
    if (y > ph - 40) { doc.addPage(); y = margin }
  })

  doc.setDrawColor(corPri.r, corPri.g, corPri.b)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pw - margin, y)
  y += 4
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corSec.r, corSec.g, corSec.b)
  doc.text('TOTAL', margin + 2, y)
  doc.setTextColor(corPri.r > 200 ? 0 : corPri.r, corPri.g > 200 ? 100 : corPri.g, 0)
  doc.text(`R$ ${orcamento.valor_total.toFixed(2).replace('.', ',')}`, pw - margin - 2, y, { align: 'right' })
  y += 10

  // ── ASSINATURA ──
  if (y > ph - 35) { doc.addPage(); y = margin }

  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  const sigX = pw / 2 - 40
  doc.line(sigX, y + 12, sigX + 80, y + 12)
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text('Assinatura do Cliente', pw / 2, y + 16, { align: 'center' })
  doc.text('Declaro que li e concordo com os serviços descritos acima.', pw / 2, y + 21, { align: 'center' })

  const hoje = new Date().toLocaleDateString('pt-BR')
  doc.setFontSize(7)
  doc.text(`Data: ${hoje}`, margin, y + 16)

  // ── RODAPÉ ──
  doc.setFillColor(corSec.r, corSec.g, corSec.b)
  doc.rect(0, ph - 12, pw, 12, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(corPri.r, corPri.g, corPri.b)
  doc.text(brand.nome_empresa || '', pw / 2, ph - 7, { align: 'center' })
  if (brand.endereco) {
    doc.setTextColor(180, 180, 180)
    doc.setFontSize(6)
    doc.text(brand.endereco, pw / 2, ph - 3, { align: 'center' })
  }

  const nomeArq = `${tipo}_${orcamento.nome_cliente.replace(/\s+/g, '_').toLowerCase()}_${orcamento.id.slice(0, 6)}.pdf`
  doc.save(nomeArq)
}
