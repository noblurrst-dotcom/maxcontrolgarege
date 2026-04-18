import { useState, useMemo, useRef } from 'react'
import { Users, Plus, Search, Car, Trash2, X, MessageCircle, Cake, MapPin, Upload, FileDown, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import type { Cliente, Venda, Agendamento } from '../types'
import { uid, fmt, sanitizePhone } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { useCloudSync } from '../hooks/useCloudSync'

const initForm = () => ({ nome: '', telefone: '', email: '', cpf_cnpj: '', veiculo: '', placa: '', endereco: '', aniversario: '', observacoes: '' })

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, '').trim()
  const lines = clean.split(/\r?\n/)
  if (!lines.length) return { headers: [], rows: [] }
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ','
  const parseLine = (line: string): string[] => {
    const res: string[] = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else { inQ = !inQ } }
      else if (c === sep && !inQ) { res.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    res.push(cur.trim()); return res
  }
  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1).filter(l => l.trim()).map(parseLine)
  return { headers, rows }
}

function autoMapCampo(header: string): string {
  const h = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/\b(nome|name|cliente|contato)\b/.test(h)) return 'nome'
  if (/\b(tel|fone|celular|cell|phone|whatsapp|wpp)\b/.test(h) || h === 'telefone') return 'telefone'
  if (/\b(email|e.mail|mail)\b/.test(h)) return 'email'
  if (/\b(cpf|cnpj|documento|doc)\b/.test(h)) return 'cpf_cnpj'
  if (/\b(veiculo|vehicle|carro|modelo|marca)\b/.test(h)) return 'veiculo'
  if (/\b(placa|plate)\b/.test(h)) return 'placa'
  if (/\b(endereco|address|rua|logradouro)\b/.test(h)) return 'endereco'
  if (/\b(aniversario|birthday|nascimento|nasc)\b/.test(h)) return 'aniversario'
  if (/\b(obs|observa|nota|note|comentario)\b/.test(h)) return 'observacoes'
  return ''
}

function normalizarData(d: string): string {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const m = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (m) { const ano = m[3].length === 2 ? '20' + m[3] : m[3]; return `${ano}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` }
  return d
}

function calcularInatividade(
  cliente: Cliente,
  vendas: Venda[]
): { diasSemVisita: number | null; ultimaVisita: Date | null; totalVisitas: number } {
  const vendasCliente = vendas.filter(v =>
    v.nome_cliente.toLowerCase().trim() === cliente.nome.toLowerCase().trim()
  )
  if (vendasCliente.length === 0) {
    return { diasSemVisita: null, ultimaVisita: null, totalVisitas: 0 }
  }
  const datas = vendasCliente.map(v => new Date(v.data_venda).getTime())
  const ultimaVisita = new Date(Math.max(...datas))
  const diasSemVisita = Math.floor((Date.now() - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24))
  return { diasSemVisita, ultimaVisita, totalVisitas: vendasCliente.length }
}

const CAMPOS_CSV: { value: string; label: string }[] = [
  { value: '', label: '— Ignorar —' },
  { value: 'nome', label: 'Nome' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'Email' },
  { value: 'cpf_cnpj', label: 'CPF / CNPJ' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'placa', label: 'Placa' },
  { value: 'endereco', label: 'Endereço' },
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'observacoes', label: 'Observações' },
]

export default function Clientes() {
  const { data: lista, save: salvar } = useCloudSync<Cliente>({ table: 'clientes', storageKey: 'clientes' })
  const { data: vendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })
  const { data: agendamentos } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)
  const [modal, setModal] = useState(false)
  const [detalhe, setDetalhe] = useState<Cliente | null>(null)
  const [form, setForm] = useState(initForm())
  const [csvModal, setCsvModal] = useState(false)
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [csvMapeamento, setCsvMapeamento] = useState<Record<number, string>>({})
  const [csvImportados, setCsvImportados] = useState<number | null>(null)
  const [csvDragover, setCsvDragover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [abaClientes, setAbaClientes] = useState<'todos' | 'inativos'>('todos')
  const [filtroInatividade, setFiltroInatividade] = useState<30 | 60 | 90>(60)

  const handleCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (!parsed.headers.length) return
      const map: Record<number, string> = {}
      parsed.headers.forEach((h, i) => { map[i] = autoMapCampo(h) })
      setCsvData(parsed); setCsvMapeamento(map); setCsvImportados(null)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const importarCSV = () => {
    if (!csvData) return
    const novos: Cliente[] = []
    for (const row of csvData.rows) {
      const obj: Record<string, string> = {}
      Object.entries(csvMapeamento).forEach(([iStr, campo]) => {
        const idx = parseInt(iStr)
        if (campo && row[idx] !== undefined) obj[campo] = row[idx]
      })
      if (!obj.nome?.trim()) continue
      novos.push({
        id: uid(), user_id: '', nome: obj.nome.trim(),
        telefone: obj.telefone?.trim() || '', email: obj.email?.trim() || '',
        cpf_cnpj: obj.cpf_cnpj?.trim() || '', veiculo: obj.veiculo?.trim() || '',
        placa: (obj.placa?.trim() || '').toUpperCase(),
        endereco: obj.endereco?.trim() || '',
        aniversario: normalizarData(obj.aniversario?.trim() || ''),
        observacoes: obj.observacoes?.trim() || '',
        total_gasto: 0, created_at: new Date().toISOString(),
      })
    }
    const existKeys = new Set(lista.map(c => `${c.nome.toLowerCase()}|${c.telefone}`))
    const unicos = novos.filter(c => !existKeys.has(`${c.nome.toLowerCase()}|${c.telefone}`))
    salvar([...unicos, ...lista])
    setCsvImportados(unicos.length)
  }

  const baixarModelo = () => {
    const conteudo = 'nome,telefone,email,cpf_cnpj,veiculo,placa,endereco,aniversario,observacoes\nJoão Silva,11999999999,joao@email.com,123.456.789-00,Honda Civic 2020 Preto,ABC1234,"Rua das Flores, 100",1990-05-15,Cliente VIP'
    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modelo_contatos.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const fecharCsvModal = () => { setCsvModal(false); setCsvData(null); setCsvMapeamento({}); setCsvImportados(null) }

  const adicionar = () => {
    if (!form.nome) return
    const novo: Cliente = {
      id: uid(), user_id: '', nome: form.nome, telefone: form.telefone,
      email: form.email, cpf_cnpj: form.cpf_cnpj, veiculo: form.veiculo,
      placa: form.placa.toUpperCase(), endereco: form.endereco,
      aniversario: form.aniversario, observacoes: form.observacoes,
      total_gasto: 0, created_at: new Date().toISOString(),
    }
    salvar([novo, ...lista])
    setModal(false)
    setForm(initForm())
  }

  const remover = (id: string) => { salvar(lista.filter((c) => c.id !== id)); setDetalhe(null) }

  const enviarWhatsApp = (c: Cliente) => {
    const tel = sanitizePhone(c.telefone || '')
    if (!tel) return
    window.open(`https://wa.me/${tel}`, '_blank')
  }

  const getDadosCliente = (cliente: Cliente) => {
    const vendasCliente = vendas.filter(v =>
      v.nome_cliente.toLowerCase().trim() === cliente.nome.toLowerCase().trim()
    )
    const agendamentosCliente = agendamentos.filter(a =>
      a.nome_cliente.toLowerCase().trim() === cliente.nome.toLowerCase().trim()
    )
    const totalGasto = vendasCliente.reduce((sum, v) => sum + ((v as any).valor_total || v.valor || 0), 0)
    const qtdServicos = vendasCliente.length

    const agora = new Date()
    const proximoAg = agendamentosCliente
      .filter(a => new Date(a.data_hora) > agora && a.status !== 'cancelado')
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0]

    return { vendasCliente, agendamentosCliente, totalGasto, qtdServicos, proximoAg }
  }

  const clientesInativos = useMemo(() => {
    return lista
      .map(c => ({ ...c, ...calcularInatividade(c, vendas) }))
      .filter(c =>
        c.totalVisitas >= 2 &&
        c.diasSemVisita !== null &&
        c.diasSemVisita >= filtroInatividade
      )
      .sort((a, b) => (b.diasSemVisita ?? 0) - (a.diasSemVisita ?? 0))
  }, [lista, vendas, filtroInatividade])

  const ausentes30 = useMemo(() =>
    lista.filter(c => {
      const { diasSemVisita, totalVisitas } = calcularInatividade(c, vendas)
      return totalVisitas >= 1 && diasSemVisita !== null && diasSemVisita >= 30
    }).length
  , [lista, vendas])

  const ausentes90 = useMemo(() =>
    lista.filter(c => {
      const { diasSemVisita, totalVisitas } = calcularInatividade(c, vendas)
      return totalVisitas >= 1 && diasSemVisita !== null && diasSemVisita >= 90
    }).length
  , [lista, vendas])

  const exportarCSV = () => {
    const cabecalho = ['Nome', 'Telefone', 'Email', 'CPF/CNPJ', 'Veículo', 'Placa', 'Endereço', 'Aniversário', 'Total Gasto', 'Observações']
    const linhas = lista.map(c => {
      const totalReal = vendas
        .filter(v => v.nome_cliente.toLowerCase().trim() === c.nome.toLowerCase().trim())
        .reduce((sum, v) => sum + ((v as any).valor_total || v.valor || 0), 0)
      return [
        c.nome, c.telefone, c.email, c.cpf_cnpj, c.veiculo, c.placa, c.endereco,
        c.aniversario ? new Date(c.aniversario + 'T12:00:00').toLocaleDateString('pt-BR') : '',
        totalReal.toFixed(2).replace('.', ','), c.observacoes,
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
    })
    const csv = '\uFEFF' + [cabecalho.join(';'), ...linhas.map(l => l.join(';'))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtradas = useMemo(() => lista.filter((c) => {
    const t = buscaDebounced.toLowerCase()
    return c.nome.toLowerCase().includes(t) || c.placa.toLowerCase().includes(t) || c.telefone.includes(t) || (c.cpf_cnpj || '').includes(t)
  }), [lista, buscaDebounced])

  const aniversariantes = useMemo(() => lista.filter(c => {
    if (!c.aniversario) return false
    const [, m, d] = c.aniversario.split('-')
    const now = new Date()
    return parseInt(m) === now.getMonth() + 1 && parseInt(d) === now.getDate()
  }), [lista])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{lista.length} cliente{lista.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-bold transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={() => setCsvModal(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-bold transition-colors">
            <Upload size={14} /> Importar CSV
          </button>
          <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, placa, telefone ou CPF/CNPJ..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setAbaClientes('todos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            abaClientes === 'todos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={13} /> Todos ({lista.length})
        </button>
        <button
          onClick={() => setAbaClientes('inativos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            abaClientes === 'inativos'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertCircle size={13} /> Inativos
          {clientesInativos.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {clientesInativos.length}
            </span>
          )}
        </button>
      </div>

      {abaClientes === 'todos' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: lista.length, color: 'text-primary-600' },
            { label: 'Com veículo', value: lista.filter(c => c.placa).length, color: 'text-violet-600' },
            { label: 'Sem visita +30d', value: ausentes30, color: 'text-amber-600' },
            { label: 'Sem visita +90d', value: ausentes90, color: 'text-red-500' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-gray-400 mb-2">{item.label}</p>
              <p className={`text-xl sm:text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {aniversariantes.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
          <p className="text-xs font-bold text-rose-600 mb-2"><Cake size={14} className="inline mr-1" />Aniversariantes de hoje</p>
          <div className="flex flex-wrap gap-2">
            {aniversariantes.map(c => (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className="text-xs bg-white text-rose-600 font-semibold px-3 py-1 rounded-full border border-rose-200">
                  {c.nome}
                </span>
                {c.telefone && (
                  <button
                    onClick={() => {
                      const tel = c.telefone.replace(/\D/g, '')
                      const msg = `Olá ${c.nome.split(' ')[0]}! 🎉 Feliz aniversário! Que seu dia seja especial. Conte sempre conosco!`
                      window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
                    }}
                    className="p-1 text-rose-400 hover:text-green-500 transition-colors"
                    title="Enviar parabéns no WhatsApp"
                  >
                    <MessageCircle size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {abaClientes === 'inativos' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 font-medium shrink-0">Ausentes há mais de:</p>
            <div className="flex gap-1">
              {([30, 60, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setFiltroInatividade(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filtroInatividade === d
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {d} dias
                </button>
              ))}
            </div>
          </div>

          {clientesInativos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">Nenhum cliente inativo</p>
              <p className="text-xs text-gray-400 mt-1">Todos os clientes regulares visitaram nos últimos {filtroInatividade} dias</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientesInativos.map(c => {
                const badge =
                  (c.diasSemVisita ?? 0) >= 90 ? { label: '+90 dias', cls: 'bg-red-100 text-red-600' } :
                  (c.diasSemVisita ?? 0) >= 60 ? { label: '+60 dias', cls: 'bg-amber-100 text-amber-600' } :
                                                  { label: '+30 dias', cls: 'bg-yellow-100 text-yellow-700' }
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setDetalhe(c)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-amber-600">{c.nome.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                        <p className="text-[10px] text-gray-400">
                          Última visita: {c.ultimaVisita?.toLocaleDateString('pt-BR')} · {c.totalVisitas} visita{c.totalVisitas !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      {c.telefone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const tel = c.telefone.replace(/\D/g, '')
                            const msg = `Olá ${c.nome.split(' ')[0]}! Sentimos sua falta por aqui. Que tal agendar um serviço? Estamos à disposição! 😊`
                            window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
                          }}
                          className="p-1.5 text-gray-300 hover:text-green-500 transition-colors"
                          title="Enviar mensagem de retorno"
                        >
                          <MessageCircle size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {abaClientes === 'todos' && filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">{busca ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}</p>
          <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Cadastre seu primeiro cliente'}</p>
        </div>
      ) : abaClientes === 'todos' ? (
        <div className="space-y-2">
          {filtradas.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors" onClick={() => setDetalhe(c)}>
              <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-primary-600">{c.nome.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                  <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                    {c.telefone}{c.placa ? ` · ${c.placa}` : ''}{c.veiculo ? ` · ${c.veiculo}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                {(() => {
                  const { totalGasto } = getDadosCliente(c)
                  return totalGasto > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                      {fmt(totalGasto)}
                    </span>
                  ) : null
                })()}
                {c.telefone && <button onClick={(e) => { e.stopPropagation(); enviarWhatsApp(c) }} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>}
                <button onClick={(e) => { e.stopPropagation(); remover(c.id) }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Modal Novo Cliente */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Novo Cliente</h2>
              <button onClick={() => setModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                  <input type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">CPF / CNPJ</label>
                  <input type="text" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} placeholder="000.000.000-00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Aniversário</label>
                  <input type="date" value={form.aniversario} onChange={(e) => setForm({ ...form, aniversario: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Endereço</label>
                <input type="text" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Veículo</label>
                  <input type="text" value={form.veiculo} onChange={(e) => setForm({ ...form, veiculo: e.target.value })} placeholder="Ex: Honda Civic 2022 Preto" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Placa</label>
                  <input type="text" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} placeholder="ABC-1234" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none uppercase" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações sobre o cliente..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
              </div>
              <button onClick={adicionar} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-sm font-bold transition-colors">
                Cadastrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar CSV */}
      {csvModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={fecharCsvModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Importar Contatos via CSV</h2>
                <p className="text-xs text-gray-400 mt-0.5">Importe múltiplos clientes de uma só vez</p>
              </div>
              <button onClick={fecharCsvModal} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {csvImportados !== null ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{csvImportados} contato{csvImportados !== 1 ? 's' : ''} importado{csvImportados !== 1 ? 's' : ''}!</p>
                  <p className="text-sm text-gray-400 mt-1">Os contatos já aparecem na sua lista.</p>
                  <button onClick={fecharCsvModal} className="mt-5 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-sm font-bold transition-colors">
                    Concluir
                  </button>
                </div>
              ) : !csvData ? (
                <>
                  <div
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${csvDragover ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setCsvDragover(true) }}
                    onDragLeave={() => setCsvDragover(false)}
                    onDrop={e => { e.preventDefault(); setCsvDragover(false); const f = e.dataTransfer.files[0]; if (f) handleCSVFile(f) }}
                  >
                    <Upload size={36} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-700">Arraste o arquivo CSV ou clique para selecionar</p>
                    <p className="text-xs text-gray-400 mt-1.5">Separadores suportados: vírgula (,) e ponto-e-vírgula (;)</p>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }} />
                  </div>
                  <button onClick={baixarModelo} className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                    <FileDown size={14} /> Baixar modelo de CSV
                  </button>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-blue-700 mb-1.5 flex items-center gap-1"><AlertCircle size={12} /> Dicas para importar</p>
                    <ul className="space-y-0.5">
                      {['A primeira linha deve conter os cabeçalhos das colunas','A coluna nome é obrigatória','Datas de aniversário: AAAA-MM-DD ou DD/MM/AAAA','Contatos duplicados (mesmo nome + telefone) serão ignorados'].map((t, i) => (
                        <li key={i} className="text-[11px] text-blue-600 flex items-start gap-1"><span className="mt-0.5 shrink-0">•</span>{t}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700">{csvData.rows.length} linha{csvData.rows.length !== 1 ? 's' : ''} encontrada{csvData.rows.length !== 1 ? 's' : ''} no arquivo</p>
                    <button onClick={() => { setCsvData(null); setCsvMapeamento({}) }} className="ml-auto text-[10px] font-bold text-gray-400 hover:text-gray-600 underline">Trocar arquivo</button>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">Mapeamento de colunas</p>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-2 bg-gray-50 px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Coluna no CSV</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campo do sistema</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                        {csvData.headers.map((header, i) => (
                          <div key={i} className="grid grid-cols-2 items-center px-3 py-2 gap-2">
                            <p className="text-xs text-gray-700 font-medium truncate" title={header}>{header}</p>
                            <select value={csvMapeamento[i] || ''} onChange={e => setCsvMapeamento(m => ({ ...m, [i]: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                              {CAMPOS_CSV.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {csvData.rows.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2">Prévia ({Math.min(3, csvData.rows.length)} primeiras linhas)</p>
                      <div className="overflow-x-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-[11px]">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>{csvData.headers.map((h, i) => <th key={i} className="px-2 py-1.5 text-left text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {csvData.rows.slice(0, 3).map((row, ri) => (
                              <tr key={ri}>{csvData.headers.map((_, ci) => <td key={ci} className="px-2 py-1.5 text-gray-600 whitespace-nowrap max-w-[100px] truncate">{row[ci] || '—'}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const nomeIdx = parseInt(Object.entries(csvMapeamento).find(([, v]) => v === 'nome')?.[0] ?? '-1')
                    const comNome = nomeIdx >= 0 ? csvData.rows.filter(r => r[nomeIdx]?.trim()).length : 0
                    const semNome = csvData.rows.length - comNome
                    return (
                      <>
                        {nomeIdx < 0 ? (
                          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            <AlertCircle size={14} className="shrink-0" /> Mapeie a coluna Nome para continuar
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                            <p className="text-[11px] font-bold text-emerald-700">{comNome} contato{comNome !== 1 ? 's' : ''} válido{comNome !== 1 ? 's' : ''} para importar</p>
                            {semNome > 0 && <p className="text-[10px] text-amber-600 mt-0.5">{semNome} linha{semNome !== 1 ? 's' : ''} sem nome serão ignoradas</p>}
                          </div>
                        )}
                        <button
                          onClick={importarCSV}
                          disabled={nomeIdx < 0 || comNome === 0}
                          className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-dark-900 rounded-xl text-sm font-bold transition-colors"
                        >
                          Importar {comNome > 0 ? `${comNome} contato${comNome !== 1 ? 's' : ''}` : ''}
                        </button>
                      </>
                    )
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe do Cliente */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Ficha do Cliente</h2>
              <button onClick={() => setDetalhe(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-600">{detalhe.nome.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{detalhe.nome}</p>
                  {detalhe.cpf_cnpj && <p className="text-xs text-gray-400">CPF/CNPJ: {detalhe.cpf_cnpj}</p>}
                  <p className="text-xs text-gray-400">Cliente desde {new Date(detalhe.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {detalhe.telefone && (
                <button
                  onClick={() => enviarWhatsApp(detalhe)}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageCircle size={16} />
                  Enviar mensagem no WhatsApp
                  <span className="text-xs font-normal opacity-80">{detalhe.telefone}</span>
                </button>
              )}

              {(() => {
                const { totalGasto, qtdServicos, proximoAg } = getDadosCliente(detalhe)
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-emerald-600 font-medium mb-1">Total gasto</p>
                        <p className="text-lg font-bold text-emerald-600">{fmt(totalGasto)}</p>
                      </div>
                      <div className="bg-violet-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-violet-600 font-medium mb-1">Serviços</p>
                        <p className="text-lg font-bold text-violet-600">{qtdServicos}</p>
                      </div>
                    </div>

                    {proximoAg && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-blue-600 mb-1">Próximo agendamento</p>
                        <p className="text-xs font-semibold text-blue-800">
                          {new Date(proximoAg.data_hora).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        {proximoAg.servico && (
                          <p className="text-[10px] text-blue-500 mt-0.5">{proximoAg.servico}</p>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}

              <div className="grid grid-cols-2 gap-3">
                {detalhe.telefone && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5">Telefone</p>
                    <p className="text-xs font-semibold text-gray-700">{detalhe.telefone}</p>
                  </div>
                )}
                {detalhe.email && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5">Email</p>
                    <p className="text-xs font-semibold text-gray-700 truncate">{detalhe.email}</p>
                  </div>
                )}
                {detalhe.aniversario && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5">Aniversário</p>
                    <p className="text-xs font-semibold text-gray-700">{new Date(detalhe.aniversario + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>

              {detalhe.endereco && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5"><MapPin size={10} className="inline mr-1" />Endereço</p>
                  <p className="text-xs font-semibold text-gray-700">{detalhe.endereco}</p>
                </div>
              )}

              {(detalhe.veiculo || detalhe.placa) && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5"><Car size={10} className="inline mr-1" />Veículo</p>
                  <p className="text-xs font-semibold text-gray-700">{detalhe.veiculo}{detalhe.placa ? ` · ${detalhe.placa}` : ''}</p>
                </div>
              )}

              {(() => {
                const { vendasCliente } = getDadosCliente(detalhe)
                if (vendasCliente.length === 0) return null
                const historico = [...vendasCliente]
                  .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime())
                  .slice(0, 10)

                return (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">
                      Histórico de serviços
                      <span className="text-gray-400 font-normal ml-1">({vendasCliente.length} total)</span>
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {historico.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {v.descricao || 'Serviço'}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 shrink-0 ml-2">
                            {fmt((v as any).valor_total || v.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {detalhe.observacoes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Observações</p>
                  <p className="text-xs text-gray-700">{detalhe.observacoes}</p>
                </div>
              )}

              <button onClick={() => remover(detalhe.id)} className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors">
                Excluir Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
