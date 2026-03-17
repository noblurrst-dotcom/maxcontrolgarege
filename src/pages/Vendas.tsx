import { useState } from 'react'
import { ShoppingCart, Plus, Search, TrendingUp, Trash2, X, MessageCircle, Lock, Unlock, FileText, Download, PlusCircle, MinusCircle, ArrowRight } from 'lucide-react'
import type { Venda, FormaPagamento, PreVenda, PreVendaItem } from '../types'
import { useBrand } from '../contexts/BrandContext'
import jsPDF from 'jspdf'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
]

const PARCELAS = [1,2,3,4,5,6,7,8,9,10,11,12]

const initForm = () => ({ nome_cliente: '', descricao: '', valor: '', desconto: '', forma_pagamento: 'pix' as FormaPagamento, data_venda: new Date().toISOString().split('T')[0], parcelas: '1', funcionario: '', observacoes: '' })

export default function Vendas() {
  const { brand } = useBrand()
  const [tab, setTab] = useState<'vendas' | 'prevenda'>('vendas')
  const [vendas, setVendas] = useState<Venda[]>(() => { try { return JSON.parse(localStorage.getItem('vendas') || '[]') } catch { return [] } })
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'aberta' | 'fechada'>('todas')
  const [modal, setModal] = useState(false)
  const [detalhe, setDetalhe] = useState<Venda | null>(null)
  const [form, setForm] = useState(initForm())

  // Pré-Venda state
  const [preVendas, setPreVendas] = useState<PreVenda[]>(() => { try { return JSON.parse(localStorage.getItem('pre_vendas') || '[]') } catch { return [] } })
  const [pvModal, setPvModal] = useState(false)
  const [pvDetalhe, setPvDetalhe] = useState<PreVenda | null>(null)
  const [pvForm, setPvForm] = useState({ nome_cliente: '', telefone_cliente: '', desconto: '', validade: '', observacoes: '' })
  const [pvItens, setPvItens] = useState<PreVendaItem[]>([{ descricao: '', quantidade: 1, valor_unitario: 0 }])

  const salvar = (l: Venda[]) => { setVendas(l); localStorage.setItem('vendas', JSON.stringify(l)) }
  const salvarPv = (l: PreVenda[]) => { setPreVendas(l); localStorage.setItem('pre_vendas', JSON.stringify(l)) }

  // Pré-Venda helpers
  const pvSubtotal = pvItens.reduce((a, i) => a + i.quantidade * i.valor_unitario, 0)
  const pvDesc = parseFloat(pvForm.desconto || '0')
  const pvTotal = Math.max(pvSubtotal - pvDesc, 0)

  const adicionarPv = () => {
    if (!pvForm.nome_cliente || pvItens.every(i => !i.descricao)) return
    const validItens = pvItens.filter(i => i.descricao)
    const novo: PreVenda = {
      id: uid(), user_id: '', cliente_id: null, nome_cliente: pvForm.nome_cliente,
      telefone_cliente: pvForm.telefone_cliente, itens: validItens,
      valor_total: pvTotal, status: 'pendente', validade: pvForm.validade || '',
      observacoes: pvForm.observacoes, created_at: new Date().toISOString(),
    }
    salvarPv([novo, ...preVendas])
    setPvModal(false)
    setPvForm({ nome_cliente: '', telefone_cliente: '', desconto: '', validade: '', observacoes: '' })
    setPvItens([{ descricao: '', quantidade: 1, valor_unitario: 0 }])
  }

  const removerPv = (id: string) => { salvarPv(preVendas.filter(p => p.id !== id)); setPvDetalhe(null) }

  const converterEmVenda = (pv: PreVenda) => {
    const nova: Venda = {
      id: uid(), user_id: '', cliente_id: null, nome_cliente: pv.nome_cliente,
      descricao: pv.itens.map(i => i.descricao).join(', '), valor: pv.valor_total,
      desconto: 0, valor_total: pv.valor_total, forma_pagamento: 'pix',
      data_venda: new Date().toISOString().split('T')[0], status: 'fechada',
      parcelas: 1, funcionario: '', observacoes: `Convertido de pré-venda. ${pv.observacoes}`,
      created_at: new Date().toISOString(),
    }
    salvar([nova, ...vendas])
    salvarPv(preVendas.map(p => p.id === pv.id ? { ...p, status: 'aprovado' as const } : p))
    setPvDetalhe(null)
    setTab('vendas')
  }

  const exportarPvPDF = (o: PreVenda) => {
    const doc = new jsPDF()
    const pw = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20
    const hexToRgb = (hex: string) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) })
    const corPri = hexToRgb(brand.cor_primaria || '#CFFF04')
    const corSec = hexToRgb(brand.cor_secundaria || '#0d0d1a')
    if (brand.pdf_mostrar_logo && brand.logo_url) { try { doc.addImage(brand.logo_url, 'PNG', margin, y, 30, 30) } catch { /* ignore */ } y += 2 }
    const headerX = brand.pdf_mostrar_logo && brand.logo_url ? margin + 36 : margin
    doc.setFontSize(18); doc.setTextColor(corSec.r, corSec.g, corSec.b); doc.setFont('helvetica', 'bold')
    doc.text(brand.nome_empresa || 'Pré-Venda', headerX, y + 8)
    if (brand.slogan) { doc.setFontSize(9); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal'); doc.text(brand.slogan, headerX, y + 14) }
    if (brand.pdf_mostrar_dados) {
      doc.setFontSize(8); doc.setTextColor(130, 130, 130); let infoY = y + (brand.slogan ? 20 : 16)
      if (brand.cnpj) { doc.text(`CNPJ: ${brand.cnpj}`, headerX, infoY); infoY += 4 }
      if (brand.telefone) { doc.text(`Tel: ${brand.telefone}`, headerX, infoY); infoY += 4 }
      if (brand.endereco) { doc.text(brand.endereco, headerX, infoY); infoY += 4 }
      if (brand.email) { doc.text(brand.email, headerX, infoY) }
    }
    y += (brand.pdf_mostrar_logo && brand.logo_url ? 34 : 22)
    doc.setDrawColor(corPri.r, corPri.g, corPri.b); doc.setLineWidth(1.5); doc.line(margin, y, pw - margin, y); y += 10
    doc.setFontSize(14); doc.setTextColor(corSec.r, corSec.g, corSec.b); doc.setFont('helvetica', 'bold'); doc.text('PRÉ-VENDA / ORÇAMENTO', margin, y)
    doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.setFont('helvetica', 'normal'); doc.text(`Data: ${new Date(o.created_at).toLocaleDateString('pt-BR')}`, pw - margin, y, { align: 'right' }); y += 8
    doc.setFontSize(10); doc.setTextColor(60, 60, 60); doc.text(`Cliente: ${o.nome_cliente}`, margin, y)
    if (o.telefone_cliente) { doc.text(`Tel: ${o.telefone_cliente}`, pw - margin, y, { align: 'right' }) }; y += 6
    if (o.validade) { doc.setFontSize(9); doc.setTextColor(130, 130, 130); doc.text(`Válido até: ${new Date(o.validade).toLocaleDateString('pt-BR')}`, margin, y); y += 6 }; y += 4
    const colX = [margin, pw - margin - 60, pw - margin - 30, pw - margin]
    doc.setFillColor(corSec.r, corSec.g, corSec.b); doc.roundedRect(margin, y, pw - 2 * margin, 8, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
    doc.text('Serviço', colX[0] + 4, y + 5.5); doc.text('Qtd', colX[1], y + 5.5, { align: 'center' }); doc.text('Unit.', colX[2], y + 5.5, { align: 'center' }); doc.text('Subtotal', colX[3], y + 5.5, { align: 'right' }); y += 12
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); let subT = 0
    o.itens.forEach((item) => { const sub = item.quantidade * item.valor_unitario; subT += sub; doc.setFontSize(9); doc.text(item.descricao, colX[0] + 4, y); doc.text(String(item.quantidade), colX[1], y, { align: 'center' }); doc.text(fmt(item.valor_unitario), colX[2], y, { align: 'center' }); doc.setFont('helvetica', 'bold'); doc.text(fmt(sub), colX[3], y, { align: 'right' }); doc.setFont('helvetica', 'normal'); y += 7; doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2); doc.line(margin, y - 2, pw - margin, y - 2) })
    y += 4; doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text('Subtotal:', pw - margin - 40, y); doc.text(fmt(subT), pw - margin, y, { align: 'right' }); y += 6
    if (subT > o.valor_total) { doc.setTextColor(220, 50, 50); doc.text('Desconto:', pw - margin - 40, y); doc.text(`-${fmt(subT - o.valor_total)}`, pw - margin, y, { align: 'right' }); y += 6 }
    doc.setFontSize(12); doc.setTextColor(corSec.r, corSec.g, corSec.b); doc.setFont('helvetica', 'bold'); doc.text('TOTAL:', pw - margin - 40, y); doc.text(fmt(o.valor_total), pw - margin, y, { align: 'right' }); y += 10
    if (o.observacoes) { doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.setFont('helvetica', 'italic'); doc.text(`Obs: ${o.observacoes}`, margin, y, { maxWidth: pw - 2 * margin }); y += 10 }
    if (brand.pdf_termos) { doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(margin, y, pw - margin, y); y += 6; doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal'); const tl = doc.splitTextToSize(brand.pdf_termos, pw - 2 * margin); doc.text(tl, margin, y); y += tl.length * 4 + 6 }
    if (brand.pdf_rodape) { doc.setDrawColor(corPri.r, corPri.g, corPri.b); doc.setLineWidth(1); doc.line(margin, y, pw - margin, y); y += 6; doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'bold'); doc.text(brand.pdf_rodape, pw / 2, y, { align: 'center' }) }
    doc.save(`prevenda_${o.nome_cliente.replace(/\s+/g, '_').toLowerCase()}.pdf`)
  }

  const adicionar = () => {
    if (!form.nome_cliente || !form.valor) return
    const valor = parseFloat(form.valor)
    const desconto = parseFloat(form.desconto || '0')
    const valorTotal = Math.max(valor - desconto, 0)
    const nova: Venda = {
      id: uid(), user_id: '', cliente_id: null, nome_cliente: form.nome_cliente,
      descricao: form.descricao, valor, desconto, valor_total: valorTotal,
      forma_pagamento: form.forma_pagamento, data_venda: form.data_venda,
      status: 'fechada', parcelas: parseInt(form.parcelas),
      funcionario: form.funcionario, observacoes: form.observacoes,
      created_at: new Date().toISOString(),
    }
    salvar([nova, ...vendas])
    setModal(false)
    setForm(initForm())
  }

  const remover = (id: string) => { salvar(vendas.filter((v) => v.id !== id)); setDetalhe(null) }
  const toggleStatus = (id: string) => salvar(vendas.map((v) => v.id === id ? { ...v, status: v.status === 'aberta' ? 'fechada' as const : 'aberta' as const } : v))

  const enviarWhatsApp = (v: Venda) => {
    const texto = `*Venda* - ${v.nome_cliente}\n${v.descricao}\nValor: ${fmt(v.valor_total || v.valor)}\nPagamento: ${FORMAS.find(f => f.value === v.forma_pagamento)?.label}\nData: ${new Date(v.data_venda).toLocaleDateString('pt-BR')}${v.parcelas > 1 ? `\nParcelas: ${v.parcelas}x` : ''}${v.desconto ? `\nDesconto: ${fmt(v.desconto)}` : ''}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const filtradas = vendas.filter((v) => {
    const t = busca.toLowerCase()
    const matchBusca = v.nome_cliente.toLowerCase().includes(t) || v.descricao.toLowerCase().includes(t)
    const matchStatus = filtroStatus === 'todas' || v.status === filtroStatus
    return matchBusca && matchStatus
  })

  const hoje = new Date().toISOString().split('T')[0]
  const totalHoje = vendas.filter((v) => v.data_venda === hoje).reduce((a, v) => a + (v.valor_total || v.valor), 0)
  const mesAtual = new Date().getMonth()
  const anoAtual = new Date().getFullYear()
  const totalMes = vendas.filter((v) => { const d = new Date(v.data_venda); return d.getMonth() === mesAtual && d.getFullYear() === anoAtual }).reduce((a, v) => a + (v.valor_total || v.valor), 0)
  const abertas = vendas.filter(v => v.status === 'aberta').length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{vendas.length} venda{vendas.length !== 1 ? 's' : ''}{abertas > 0 ? ` · ${abertas} aberta${abertas !== 1 ? 's' : ''}` : ''}</p>
        </div>
        <div className="flex gap-2">
          {tab === 'prevenda' && (
            <button onClick={() => setPvModal(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold transition-colors shadow-sm">
              <Plus size={14} /> Nova Pré-Venda
            </button>
          )}
          <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm">
            <Plus size={16} /> Nova Venda
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setTab('vendas')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${tab === 'vendas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <ShoppingCart size={14} /> Vendas
        </button>
        <button onClick={() => setTab('prevenda')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${tab === 'prevenda' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileText size={14} /> Pré-Venda{preVendas.length > 0 ? ` (${preVendas.length})` : ''}
        </button>
      </div>

      {tab === 'vendas' && (<>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente ou descrição..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
        </div>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="todas">Todas</option>
          <option value="aberta">Abertas</option>
          <option value="fechada">Fechadas</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total hoje', value: fmt(totalHoje), color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
          { label: 'Total mês', value: fmt(totalMes), color: 'text-primary-600', iconBg: 'bg-primary-100' },
          { label: 'Qtd vendas', value: vendas.length, color: 'text-violet-600', iconBg: 'bg-violet-100' },
          { label: 'Abertas', value: abertas, color: 'text-amber-600', iconBg: 'bg-amber-100' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 ${item.iconBg} rounded-xl flex items-center justify-center`}><TrendingUp size={16} className={`sm:hidden ${item.color}`} /><TrendingUp size={18} className={`hidden sm:block ${item.color}`} /></div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-400">{item.label}</p>
            </div>
            <p className={`text-lg sm:text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <ShoppingCart size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">{busca ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}</p>
          <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Registre sua primeira venda'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 active:bg-gray-50 transition-colors" onClick={() => setDetalhe(v)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${v.status === 'aberta' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    {v.status === 'aberta' ? <Unlock size={16} className="text-amber-600" /> : <Lock size={16} className="text-emerald-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{v.nome_cliente}</p>
                      <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${v.status === 'aberta' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {v.status === 'aberta' ? 'Aberta' : 'Fechada'}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-400 truncate">{v.descricao} · {FORMAS.find((f) => f.value === v.forma_pagamento)?.label} · {new Date(v.data_venda).toLocaleDateString('pt-BR')}{v.parcelas > 1 ? ` · ${v.parcelas}x` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                  <p className="text-sm font-bold text-emerald-600">{fmt(v.valor_total || v.valor)}</p>
                  <button onClick={(e) => { e.stopPropagation(); enviarWhatsApp(v) }} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); remover(v.id) }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>)}

      {/* Modal Nova Venda */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nova Venda</h2>
              <button onClick={() => setModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente *</label>
                <input type="text" value={form.nome_cliente} onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })} placeholder="Nome do cliente" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Serviços / Descrição</label>
                <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Polimento completo + Higienização" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Desconto (R$)</label>
                  <input type="number" step="0.01" value={form.desconto} onChange={(e) => setForm({ ...form, desconto: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Pagamento</label>
                  <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value as FormaPagamento })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    {FORMAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Parcelas</label>
                  <select value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    {PARCELAS.map((p) => <option key={p} value={p}>{p}x</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data *</label>
                  <input type="date" value={form.data_venda} onChange={(e) => setForm({ ...form, data_venda: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Funcionário</label>
                  <input type="text" value={form.funcionario} onChange={(e) => setForm({ ...form, funcionario: e.target.value })} placeholder="Opcional" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações da venda..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
              </div>
              {/* Resumo */}
              {form.valor && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-600 mb-2">Resumo da venda</p>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Sub-total</span><span className="font-semibold">{fmt(parseFloat(form.valor) || 0)}</span></div>
                  {parseFloat(form.desconto || '0') > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Desconto</span><span className="font-semibold text-red-500">-{fmt(parseFloat(form.desconto))}</span></div>}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Total</span><span className="text-emerald-600">{fmt(Math.max((parseFloat(form.valor) || 0) - (parseFloat(form.desconto || '0')), 0))}</span></div>
                </div>
              )}
              <button onClick={adicionar} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-sm font-bold transition-colors">
                Registrar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe da Venda */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Venda - {detalhe.status === 'fechada' ? 'Fechada' : 'Aberta'}</h2>
              <button onClick={() => setDetalhe(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><span className="text-sm font-bold text-primary-600">{detalhe.nome_cliente.slice(0,2).toUpperCase()}</span></div>
                <div><p className="text-sm font-bold text-gray-900">{detalhe.nome_cliente}</p><p className="text-xs text-gray-400">Cliente</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-600 mb-2">Resumo da venda</p>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Venda do dia</span><span>{new Date(detalhe.data_venda).toLocaleDateString('pt-BR')}</span></div>
                {detalhe.descricao && <div className="flex justify-between text-xs"><span className="text-gray-500">Serviços</span><span>{detalhe.descricao}</span></div>}
                <div className="flex justify-between text-xs"><span className="text-gray-500">Subtotal</span><span>{fmt(detalhe.valor)}</span></div>
                {detalhe.desconto > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Desconto</span><span className="text-red-500">-{fmt(detalhe.desconto)}</span></div>}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Valor total</span><span className="text-emerald-600">{fmt(detalhe.valor_total || detalhe.valor)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Pagamento</span><span>{FORMAS.find(f => f.value === detalhe.forma_pagamento)?.label}{detalhe.parcelas > 1 ? ` · ${detalhe.parcelas}x` : ''}</span></div>
                {detalhe.funcionario && <div className="flex justify-between text-xs"><span className="text-gray-500">Funcionário</span><span>{detalhe.funcionario}</span></div>}
                {detalhe.observacoes && <div className="text-xs text-gray-500 mt-2"><span className="font-medium">Obs:</span> {detalhe.observacoes}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { toggleStatus(detalhe.id); setDetalhe({ ...detalhe, status: detalhe.status === 'aberta' ? 'fechada' : 'aberta' }) }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${detalhe.status === 'aberta' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                  {detalhe.status === 'aberta' ? 'Fechar venda' : 'Reabrir venda'}
                </button>
                <button onClick={() => enviarWhatsApp(detalhe)} className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
              <button onClick={() => remover(detalhe.id)} className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors">
                Excluir Venda
              </button>
            </div>
          </div>
        </div>
      )}
      {/* === Pré-Venda Tab === */}
      {tab === 'prevenda' && (
        <>
          {preVendas.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <FileText size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold text-lg">Nenhuma pré-venda</p>
              <p className="text-gray-400 text-sm mt-1">Crie orçamentos de pré-venda para enviar ao cliente e converter em vendas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {preVendas.map((pv) => {
                const stColor = pv.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : pv.status === 'recusado' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                return (
                  <div key={pv.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 active:bg-gray-50 transition-colors" onClick={() => setPvDetalhe(pv)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><FileText size={16} className="text-blue-600" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{pv.nome_cliente}</p>
                          <p className="text-[11px] sm:text-xs text-gray-400 truncate">{pv.itens.length} ite{pv.itens.length === 1 ? 'm' : 'ns'} · {new Date(pv.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                        <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${stColor}`}>
                          {pv.status === 'aprovado' ? 'Convertida' : pv.status === 'recusado' ? 'Cancelada' : 'Pendente'}
                        </span>
                        <p className="text-sm font-bold text-gray-900">{fmt(pv.valor_total)}</p>
                        <button onClick={(e) => { e.stopPropagation(); removerPv(pv.id) }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Nova Pré-Venda */}
      {pvModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPvModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nova Pré-Venda</h2>
              <button onClick={() => setPvModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente *</label>
                  <input type="text" value={pvForm.nome_cliente} onChange={(e) => setPvForm({ ...pvForm, nome_cliente: e.target.value })} placeholder="Nome do cliente" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                  <input type="tel" value={pvForm.telefone_cliente} onChange={(e) => setPvForm({ ...pvForm, telefone_cliente: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">Itens</label>
                  <button type="button" onClick={() => setPvItens([...pvItens, { descricao: '', quantidade: 1, valor_unitario: 0 }])} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"><PlusCircle size={12} /> Adicionar</button>
                </div>
                <div className="space-y-2">
                  {pvItens.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input type="text" value={item.descricao} onChange={(e) => { const n = [...pvItens]; n[idx] = { ...n[idx], descricao: e.target.value }; setPvItens(n) }} placeholder="Serviço" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                      <input type="number" min="1" value={item.quantidade} onChange={(e) => { const n = [...pvItens]; n[idx] = { ...n[idx], quantidade: parseInt(e.target.value) || 1 }; setPvItens(n) }} className="w-14 px-2 py-2 border border-gray-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none" />
                      <input type="number" step="0.01" value={item.valor_unitario || ''} onChange={(e) => { const n = [...pvItens]; n[idx] = { ...n[idx], valor_unitario: parseFloat(e.target.value) || 0 }; setPvItens(n) }} placeholder="R$" className="w-24 px-2 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      {pvItens.length > 1 && <button type="button" onClick={() => setPvItens(pvItens.filter((_, i) => i !== idx))} className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"><MinusCircle size={16} /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Desconto (R$)</label>
                  <input type="number" step="0.01" value={pvForm.desconto} onChange={(e) => setPvForm({ ...pvForm, desconto: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Validade</label>
                  <input type="date" value={pvForm.validade} onChange={(e) => setPvForm({ ...pvForm, validade: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={pvForm.observacoes} onChange={(e) => setPvForm({ ...pvForm, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
              </div>
              {pvSubtotal > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-600 mb-2">Resumo</p>
                  {pvItens.filter(i => i.descricao).map((i, idx) => (
                    <div key={idx} className="flex justify-between text-xs"><span className="text-gray-500">{i.descricao} ({i.quantidade}x)</span><span className="font-semibold">{fmt(i.quantidade * i.valor_unitario)}</span></div>
                  ))}
                  {pvDesc > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Desconto</span><span className="font-semibold text-red-500">-{fmt(pvDesc)}</span></div>}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Total</span><span className="text-emerald-600">{fmt(pvTotal)}</span></div>
                </div>
              )}
              <button onClick={adicionarPv} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors">
                Criar Pré-Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe Pré-Venda */}
      {pvDetalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPvDetalhe(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Pré-Venda</h2>
              <button onClick={() => setPvDetalhe(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><span className="text-sm font-bold text-blue-600">{pvDetalhe.nome_cliente.slice(0, 2).toUpperCase()}</span></div>
                <div><p className="text-sm font-bold text-gray-900">{pvDetalhe.nome_cliente}</p>{pvDetalhe.telefone_cliente && <p className="text-xs text-gray-400">{pvDetalhe.telefone_cliente}</p>}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-600 mb-2">Itens da pré-venda</p>
                {pvDetalhe.itens.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs"><span className="text-gray-600">{i.descricao} ({i.quantidade}x {fmt(i.valor_unitario)})</span><span className="font-semibold">{fmt(i.quantidade * i.valor_unitario)}</span></div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Total</span><span className="text-emerald-600">{fmt(pvDetalhe.valor_total)}</span></div>
                {pvDetalhe.validade && <p className="text-[10px] text-gray-400">Válido até {new Date(pvDetalhe.validade).toLocaleDateString('pt-BR')}</p>}
                {pvDetalhe.observacoes && <p className="text-[10px] text-gray-400">Obs: {pvDetalhe.observacoes}</p>}
              </div>
              <div className="flex gap-2">
                {pvDetalhe.status === 'pendente' && (
                  <button onClick={() => converterEmVenda(pvDetalhe)} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <ArrowRight size={14} /> Converter em Venda
                  </button>
                )}
                <button onClick={() => exportarPvPDF(pvDetalhe)} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                  <Download size={14} /> Exportar PDF
                </button>
              </div>
              {pvDetalhe.telefone_cliente && (
                <button onClick={() => { const tel = pvDetalhe.telefone_cliente?.replace(/\D/g, ''); window.open(`https://wa.me/${tel ? '55' + tel : ''}`, '_blank') }} className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              )}
              <button onClick={() => removerPv(pvDetalhe.id)} className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors">
                Excluir Pré-Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
