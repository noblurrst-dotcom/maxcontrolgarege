import { useState, useMemo } from 'react'
import {
  BarChart2, ShoppingCart, CalendarDays, Users,
  Briefcase, FileText, TrendingUp, TrendingDown,
  Download, Search, FileDown, Loader2,
} from 'lucide-react'
import { useCloudSync } from '../hooks/useCloudSync'
import { useBrand } from '../contexts/BrandContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import type { Venda, Agendamento, Cliente, Servico, PreVenda, ContaFinanceira } from '../types'

// ─── Utilitário CSV ───────────────────────────────────────────────────────────
function gerarCSV(cabecalho: string[], linhas: (string | number)[][]): string {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return '\uFEFF' + [
    cabecalho.join(';'),
    ...linhas.map(l => l.map(esc).join(';')),
  ].join('\r\n')
}

function baixarCSV(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const csv = gerarCSV(cabecalho, linhas)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Utilitário PDF ───────────────────────────────────────────────────────────
function gerarPDFTabela(
  nomeRelatorio: string,
  cabecalho: string[],
  linhas: (string | number)[][],
  brand: { nome_empresa: string; cor_primaria: string; cor_secundaria: string }
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()

  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '')
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
  }
  const pri = hexToRgb(brand.cor_primaria || '#CFFF04')
  const sec = hexToRgb(brand.cor_secundaria || '#0d0d1a')

  // Header
  doc.setFillColor(sec.r, sec.g, sec.b)
  doc.rect(0, 0, pw, 20, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pri.r, pri.g, pri.b)
  doc.text(brand.nome_empresa || 'Relatório', 10, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text(nomeRelatorio, pw / 2, 13, { align: 'center' })
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pw - 10, 13, { align: 'right' })

  // Cabeçalho da tabela
  let y = 28
  const colW = (pw - 20) / cabecalho.length
  doc.setFillColor(pri.r, pri.g, pri.b)
  doc.rect(10, y - 5, pw - 20, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(sec.r, sec.g, sec.b)
  cabecalho.forEach((col, i) => {
    doc.text(col, 12 + i * colW, y, { maxWidth: colW - 3 })
  })
  y += 6

  // Linhas
  doc.setFont('helvetica', 'normal')
  linhas.forEach((linha, li) => {
    if (y > ph - 15) {
      doc.addPage()
      y = 15
    }
    doc.setFillColor(li % 2 === 0 ? 248 : 255, li % 2 === 0 ? 248 : 255, li % 2 === 0 ? 248 : 255)
    doc.rect(10, y - 4, pw - 20, 7, 'F')
    doc.setTextColor(50, 50, 50)
    doc.setFontSize(7.5)
    linha.forEach((cell, i) => {
      doc.text(String(cell ?? '—'), 12 + i * colW, y, { maxWidth: colW - 3 })
    })
    y += 7
  })

  // Rodapé
  doc.setFillColor(sec.r, sec.g, sec.b)
  doc.rect(0, ph - 10, pw, 10, 'F')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`${linhas.length} registro(s)`, 10, ph - 4)
  doc.text(brand.nome_empresa, pw / 2, ph - 4, { align: 'center' })

  doc.save(`${nomeRelatorio.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Relatorios() {
  const { brand } = useBrand()
  const [busca, setBusca] = useState('')
  const [gerando, setGerando] = useState<string | null>(null)

  const { data: vendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })
  const { data: agendamentos } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: clientes } = useCloudSync<Cliente>({ table: 'clientes', storageKey: 'clientes' })
  const { data: servicos } = useCloudSync<Servico>({ table: 'servicos', storageKey: 'servicos' })
  const { data: preVendas } = useCloudSync<PreVenda>({ table: 'pre_vendas', storageKey: 'pre_vendas' })
  const { data: financeiro } = useCloudSync<ContaFinanceira>({ table: 'financeiro', storageKey: 'financeiro' })

  // ── Definição dos relatórios ──────────────────────────────────────────────
  const relatorios = useMemo(() => [
    {
      id: 'dfc',
      nome: 'Fluxo de Caixa (DFC)',
      descricao: 'Entradas e saídas consolidadas por período',
      icon: BarChart2,
      cor: 'text-emerald-600',
      bg: 'bg-emerald-50',
      cabecalho: ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Pago'],
      linhas: () => [
        ...vendas.map(v => [
          v.data_venda ? format(new Date(v.data_venda), 'dd/MM/yyyy') : '—',
          'Entrada',
          'Venda',
          v.descricao || v.nome_cliente || '—',
          Number(v.valor_total || v.valor || 0).toFixed(2),
          'Sim',
        ]),
        ...financeiro.map(f => [
          f.data ? format(new Date(f.data), 'dd/MM/yyyy') : '—',
          f.tipo === 'entrada' ? 'Entrada' : 'Saída',
          f.categoria || '—',
          f.descricao || '—',
          Number(f.valor || 0).toFixed(2),
          f.pago ? 'Sim' : 'Não',
        ]),
      ],
    },
    {
      id: 'vendas',
      nome: 'Vendas realizadas',
      descricao: `${vendas.length} venda(s) no sistema`,
      icon: ShoppingCart,
      cor: 'text-blue-600',
      bg: 'bg-blue-50',
      cabecalho: ['Data', 'Cliente', 'Descrição', 'Forma Pgto', 'Valor (R$)', 'Desconto (R$)', 'Total (R$)', 'Status'],
      linhas: () => vendas.map(v => [
        v.data_venda ? format(new Date(v.data_venda), 'dd/MM/yyyy') : '—',
        v.nome_cliente || '—',
        v.descricao || '—',
        v.forma_pagamento || '—',
        Number(v.valor || 0).toFixed(2),
        Number(v.desconto || 0).toFixed(2),
        Number(v.valor_total || v.valor || 0).toFixed(2),
        v.status || '—',
      ]),
    },
    {
      id: 'agendamentos',
      nome: 'Agendamentos da agenda',
      descricao: `${agendamentos.length} agendamento(s) no sistema`,
      icon: CalendarDays,
      cor: 'text-violet-600',
      bg: 'bg-violet-50',
      cabecalho: ['Data/Hora', 'Cliente', 'Serviço', 'Status', 'Duração (min)', 'Valor (R$)'],
      linhas: () => agendamentos.map(a => [
        a.data_hora ? format(new Date(a.data_hora), 'dd/MM/yyyy HH:mm') : '—',
        a.nome_cliente || '—',
        a.servico || '—',
        a.status || '—',
        a.duracao_min || '—',
        Number(a.valor || 0).toFixed(2),
      ]),
    },
    {
      id: 'clientes',
      nome: 'Clientes cadastrados',
      descricao: `${clientes.length} cliente(s) no sistema`,
      icon: Users,
      cor: 'text-primary-600',
      bg: 'bg-primary-50',
      cabecalho: ['Nome', 'Telefone', 'Email', 'CPF/CNPJ', 'Veículo', 'Placa', 'Cadastrado em'],
      linhas: () => clientes.map(c => [
        c.nome || '—',
        c.telefone || '—',
        c.email || '—',
        c.cpf_cnpj || '—',
        c.veiculo || '—',
        c.placa || '—',
        c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy') : '—',
      ]),
    },
    {
      id: 'servicos',
      nome: 'Serviços cadastrados',
      descricao: `${servicos.length} serviço(s) no sistema`,
      icon: Briefcase,
      cor: 'text-amber-600',
      bg: 'bg-amber-50',
      cabecalho: ['Nome', 'Descrição', 'Preço Padrão (R$)'],
      linhas: () => servicos.map(s => [
        s.nome || '—',
        s.descricao || '—',
        Number(s.preco_padrao || 0).toFixed(2),
      ]),
    },
    {
      id: 'orcamentos',
      nome: 'Orçamentos criados',
      descricao: `${preVendas.length} orçamento(s) no sistema`,
      icon: FileText,
      cor: 'text-rose-600',
      bg: 'bg-rose-50',
      cabecalho: ['Data', 'Cliente', 'Telefone', 'Total (R$)', 'Status', 'Validade'],
      linhas: () => preVendas.map(pv => [
        pv.created_at ? format(new Date(pv.created_at), 'dd/MM/yyyy') : '—',
        pv.nome_cliente || '—',
        pv.telefone_cliente || '—',
        Number(pv.valor_total || 0).toFixed(2),
        pv.status || '—',
        pv.validade ? format(new Date(pv.validade), 'dd/MM/yyyy') : '—',
      ]),
    },
    {
      id: 'entradas',
      nome: 'Entradas financeiras',
      descricao: `${financeiro.filter(f => f.tipo === 'entrada').length} entrada(s) registrada(s)`,
      icon: TrendingUp,
      cor: 'text-emerald-600',
      bg: 'bg-emerald-50',
      cabecalho: ['Data', 'Categoria', 'Descrição', 'Valor (R$)', 'Forma Pgto', 'Pago', 'Conta'],
      linhas: () => financeiro
        .filter(f => f.tipo === 'entrada')
        .map(f => [
          f.data ? format(new Date(f.data), 'dd/MM/yyyy') : '—',
          f.categoria || '—',
          f.descricao || '—',
          Number(f.valor || 0).toFixed(2),
          f.forma_pagamento || '—',
          f.pago ? 'Sim' : 'Não',
          f.conta_bancaria || '—',
        ]),
    },
    {
      id: 'saidas',
      nome: 'Saídas financeiras',
      descricao: `${financeiro.filter(f => f.tipo === 'saida').length} saída(s) registrada(s)`,
      icon: TrendingDown,
      cor: 'text-red-600',
      bg: 'bg-red-50',
      cabecalho: ['Data', 'Categoria', 'Descrição', 'Valor (R$)', 'Forma Pgto', 'Pago', 'Conta'],
      linhas: () => financeiro
        .filter(f => f.tipo === 'saida')
        .map(f => [
          f.data ? format(new Date(f.data), 'dd/MM/yyyy') : '—',
          f.categoria || '—',
          f.descricao || '—',
          Number(f.valor || 0).toFixed(2),
          f.forma_pagamento || '—',
          f.pago ? 'Sim' : 'Não',
          f.conta_bancaria || '—',
        ]),
    },
  ], [vendas, agendamentos, clientes, servicos, preVendas, financeiro])

  // ── Filtro por busca ──────────────────────────────────────────────────────
  const relatoriosFiltrados = useMemo(() =>
    relatorios.filter(r =>
      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
      r.descricao.toLowerCase().includes(busca.toLowerCase())
    ), [relatorios, busca])

  // ── Handlers de exportação ────────────────────────────────────────────────
  const exportarCSV = (rel: typeof relatorios[0]) => {
    setGerando(rel.id + '_csv')
    try {
      baixarCSV(rel.id, rel.cabecalho, rel.linhas())
    } finally {
      setGerando(null)
    }
  }

  const exportarPDF = (rel: typeof relatorios[0]) => {
    setGerando(rel.id + '_pdf')
    try {
      gerarPDFTabela(rel.nome, rel.cabecalho, rel.linhas(), {
        nome_empresa: brand.nome_empresa || 'Empresa',
        cor_primaria: brand.cor_primaria || '#CFFF04',
        cor_secundaria: brand.cor_secundaria || '#0d0d1a',
      })
    } finally {
      setGerando(null)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {relatorios.length} relatórios disponíveis
            </p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por relatório..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
        />
      </div>

      {/* Lista de relatórios */}
      <div className="space-y-2">
        {relatoriosFiltrados.map(rel => {
          const Icon = rel.icon
          const gerandoCSV = gerando === rel.id + '_csv'
          const gerandoPDF = gerando === rel.id + '_pdf'
          return (
            <div
              key={rel.id}
              className="bg-white rounded-xl border border-gray-100 px-4 py-4 flex items-center justify-between gap-4 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              {/* Ícone + nome */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 ${rel.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={rel.cor} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{rel.nome}</p>
                  <p className="text-xs text-gray-400 truncate">{rel.descricao}</p>
                </div>
              </div>

              {/* Botões de exportação */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => exportarPDF(rel)}
                  disabled={!!gerando}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gerandoPDF
                    ? <Loader2 size={13} className="animate-spin" />
                    : <FileDown size={13} />
                  }
                  PDF
                </button>
                <button
                  onClick={() => exportarCSV(rel)}
                  disabled={!!gerando}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gerandoCSV
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Download size={13} />
                  }
                  CSV
                </button>
              </div>
            </div>
          )
        })}

        {relatoriosFiltrados.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <BarChart2 size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum relatório encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Tente outro termo de busca</p>
          </div>
        )}
      </div>
    </div>
  )
}
