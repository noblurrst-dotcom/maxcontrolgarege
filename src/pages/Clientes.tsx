import { useState, useMemo, useRef, useEffect } from 'react'
import { Users, Plus, Search, Car, Trash2, X, MessageCircle, Cake, MapPin, Upload, FileDown, AlertCircle, CheckCircle2, Download, Pencil, Camera, Loader2, ChevronDown, ChevronUp, ClipboardCheck, Mail, CreditCard, ShoppingCart, CalendarDays, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Cliente, Venda, Agendamento, Veiculo } from '../types'
import { uid, fmt, sanitizePhone } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { useCloudSync } from '../hooks/useCloudSync'
import { supabase, garantirBucketFotosVeiculos } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { validarArquivo } from '../lib/validarArquivo'
import ChecklistEmbutido from '../components/ChecklistEmbutido'

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
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: lista, save: salvar } = useCloudSync<Cliente>({ table: 'clientes', storageKey: 'clientes' })
  const { data: vendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })
  const { data: agendamentos } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: veiculos, save: salvarVeiculos } = useCloudSync<Veiculo>({ table: 'veiculos', storageKey: 'veiculos' })
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
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [mostrarChecklistCliente, setMostrarChecklistCliente] = useState(false)
  const [checklistClienteSalvo, setChecklistClienteSalvo] = useState(false)
  const [camposAtivos, setCamposAtivos] = useState<Set<string>>(new Set())
  const [buscaVeiculo, setBuscaVeiculo] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [veiculoModal, setVeiculoModal] = useState(false)
  const [veiculoEditando, setVeiculoEditando] = useState<Veiculo | null>(null)
  const [uploadingFaceVeiculo, setUploadingFaceVeiculo] = useState<string | null>(null)
  const initVeiculoForm = () => ({ placa: '', modelo: '', marca: '', ano: '', cor: '', observacoes: '' })
  const [veiculoForm, setVeiculoForm] = useState(initVeiculoForm())

  const toggleCampo = (campo: string) => {
    setCamposAtivos(prev => {
      const next = new Set(prev)
      if (next.has(campo)) {
        next.delete(campo)
        setForm(f => ({ ...f, [campo]: '' }))
      } else {
        next.add(campo)
      }
      return next
    })
  }

  useEffect(() => { garantirBucketFotosVeiculos() }, [])

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
    if (editandoId) {
      const existente = lista.find(c => c.id === editandoId)
      if (existente) {
        const atualizado = { ...existente, ...form, placa: form.placa.toUpperCase() }
        salvar(lista.map(c => c.id === editandoId ? atualizado : c))
      }
      setEditandoId(null)
    } else {
      const novo: Cliente = {
        id: uid(), user_id: '', nome: form.nome, telefone: form.telefone,
        email: form.email, cpf_cnpj: form.cpf_cnpj, veiculo: form.veiculo,
        placa: form.placa.toUpperCase(), endereco: form.endereco,
        aniversario: form.aniversario, observacoes: form.observacoes,
        total_gasto: 0, created_at: new Date().toISOString(),
      }
      salvar([novo, ...lista])
    }
    setModal(false)
    setForm(initForm())
    setCamposAtivos(new Set())
    setEditandoId(null)
  }

  const remover = (id: string) => { salvar(lista.filter((c) => c.id !== id)); setDetalhe(null) }

  const getVeiculosCliente = (clienteId: string): Veiculo[] =>
    veiculos.filter(v => v.cliente_id === clienteId)

  const salvarVeiculo = () => {
    if (!detalhe || !veiculoForm.placa) return
    if (veiculoEditando) {
      salvarVeiculos(veiculos.map(v =>
        v.id === veiculoEditando.id ? { ...v, ...veiculoForm, placa: veiculoForm.placa.toUpperCase() } : v
      ))
    } else {
      const novo: Veiculo = {
        id: uid(),
        user_id: user?.id || '',
        cliente_id: detalhe.id,
        ...veiculoForm,
        placa: veiculoForm.placa.toUpperCase(),
        created_at: new Date().toISOString(),
      }
      salvarVeiculos([novo, ...veiculos])
    }
    setVeiculoModal(false)
    setVeiculoForm(initVeiculoForm())
    setVeiculoEditando(null)
  }

  const removerVeiculo = async (veiculo: Veiculo) => {
    const faces = ['frente', 'traseira', 'direita', 'esquerda'] as const
    for (const face of faces) {
      const url = veiculo[`foto_${face}`]
      if (url) {
        try {
          const path = new URL(url).pathname.split('/fotos-veiculos/')[1]
          if (path) await supabase.storage.from('fotos-veiculos').remove([path])
        } catch { /* ignora */ }
      }
    }
    salvarVeiculos(veiculos.filter(v => v.id !== veiculo.id))
  }

  const uploadFotoVeiculoNovo = async (
    veiculo: Veiculo,
    face: 'frente' | 'traseira' | 'direita' | 'esquerda',
    file: File
  ) => {
    if (!user) return
    const erroArquivo = validarArquivo(file)
    if (erroArquivo) { toast.error(erroArquivo); return }
    setUploadingFaceVeiculo(`${veiculo.id}-${face}`)
    try {
      const campo = `foto_${face}` as keyof Veiculo
      const urlAtual = veiculo[campo] as string | null
      if (urlAtual) {
        try {
          const path = new URL(urlAtual).pathname.split('/fotos-veiculos/')[1]
          if (path) await supabase.storage.from('fotos-veiculos').remove([path])
        } catch { /* ignora */ }
      }
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/${veiculo.cliente_id}/${veiculo.id}/${face}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('fotos-veiculos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('fotos-veiculos').getPublicUrl(fileName)
      const atualizado = { ...veiculo, [campo]: urlData.publicUrl }
      salvarVeiculos(veiculos.map(v => v.id === veiculo.id ? atualizado : v))
      toast.success('Foto adicionada!')
    } catch {
      toast.error('Erro ao enviar foto')
    } finally {
      setUploadingFaceVeiculo(null)
    }
  }

  const removerFotoVeiculoNovo = async (
    veiculo: Veiculo,
    face: 'frente' | 'traseira' | 'direita' | 'esquerda'
  ) => {
    const campo = `foto_${face}` as keyof Veiculo
    const url = veiculo[campo] as string | null
    if (!url) return
    try {
      const path = new URL(url).pathname.split('/fotos-veiculos/')[1]
      if (path) await supabase.storage.from('fotos-veiculos').remove([path])
    } catch { /* ignora */ }
    salvarVeiculos(veiculos.map(v => v.id === veiculo.id ? { ...v, [campo]: null } : v))
  }

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
          <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-full text-xs font-bold transition-colors shadow-sm">
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
              ? 'bg-white text-warning-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertCircle size={13} /> Inativos
          {clientesInativos.length > 0 && (
            <span className="bg-warning-100 text-warning-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
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
            { label: 'Sem visita +30d', value: ausentes30, color: 'text-warning-600' },
            { label: 'Sem visita +90d', value: ausentes90, color: 'text-danger-500' },
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
                      ? 'bg-warning-500 text-white'
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
              <CheckCircle2 size={40} className="text-success-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">Nenhum cliente inativo</p>
              <p className="text-xs text-gray-400 mt-1">Todos os clientes regulares visitaram nos últimos {filtroInatividade} dias</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientesInativos.map(c => {
                const badge =
                  (c.diasSemVisita ?? 0) >= 90 ? { label: '+90 dias', cls: 'bg-danger-100 text-danger-600' } :
                  (c.diasSemVisita ?? 0) >= 60 ? { label: '+60 dias', cls: 'bg-warning-100 text-warning-600' } :
                                                  { label: '+30 dias', cls: 'bg-yellow-100 text-yellow-700' }
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setDetalhe(c)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-warning-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-warning-600">{c.nome.slice(0, 2).toUpperCase()}</span>
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
                    <span className="text-[10px] font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded-full shrink-0">
                      {fmt(totalGasto)}
                    </span>
                  ) : null
                })()}
                {c.telefone && <button onClick={(e) => { e.stopPropagation(); enviarWhatsApp(c) }} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>}
                <button onClick={(e) => { e.stopPropagation(); remover(c.id) }} className="p-1.5 text-gray-300 hover:text-danger-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Modal Novo Cliente */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setModal(false); setForm(initForm()); setCamposAtivos(new Set()); setEditandoId(null) }}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">{editandoId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => { setModal(false); setForm(initForm()); setCamposAtivos(new Set()); setEditandoId(null) }} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="space-y-4">

              {/* Nome — obrigatório */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Nome <span className="text-danger-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome completo do cliente"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              {/* WhatsApp — obrigatório */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  WhatsApp <span className="text-danger-400">*</span>
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
                  <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-500 border-r border-gray-200 shrink-0 flex items-center gap-1.5">
                    🇧🇷 +55
                  </span>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                  />
                </div>
              </div>

              {/* Veículo */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Veículo</label>
                {(form.veiculo || form.placa) ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.placa}
                      onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                      placeholder="Placa"
                      maxLength={8}
                      className="w-28 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                    />
                    <input
                      type="text"
                      value={form.veiculo}
                      onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
                      placeholder="Ex: Honda Civic 2022 Preto"
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, veiculo: '', placa: '' }))}
                      className="p-2.5 text-gray-300 hover:text-danger-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, veiculo: ' ' }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Plus size={13} /> Adicionar veículo
                  </button>
                )}
              </div>

              {/* Chips de campos opcionais */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Informações adicionais</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'email',       label: 'E-mail'      },
                    { key: 'cpf_cnpj',   label: 'CPF/CNPJ'    },
                    { key: 'endereco',   label: 'Endereço'     },
                    { key: 'aniversario', label: 'Aniversário' },
                    { key: 'observacoes', label: 'Observações' },
                  ].map(({ key, label }) => {
                    const ativo = camposAtivos.has(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCampo(key)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          ativo
                            ? 'bg-primary-500 text-on-primary shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <span>{ativo ? '−' : '+'}</span>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Campos expandidos */}
              {camposAtivos.size > 0 && (
                <div className="space-y-3 border-t border-gray-100 pt-3">

                  {camposAtivos.has('email') && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
                      <input type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="email@exemplo.com" autoFocus
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  )}

                  {camposAtivos.has('cpf_cnpj') && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">CPF / CNPJ</label>
                      <input type="text" value={form.cpf_cnpj}
                        onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  )}

                  {camposAtivos.has('endereco') && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Endereço</label>
                      <input type="text" value={form.endereco}
                        onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                        placeholder="Rua, número, bairro, cidade"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  )}

                  {camposAtivos.has('aniversario') && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Data de aniversário</label>
                      <input type="date" value={form.aniversario}
                        onChange={(e) => setForm({ ...form, aniversario: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  )}

                  {camposAtivos.has('observacoes') && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                      <textarea value={form.observacoes}
                        onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                        placeholder="Observações sobre o cliente..."
                        rows={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
                    </div>
                  )}

                </div>
              )}

              {/* Botão salvar */}
              <button
                onClick={adicionar}
                disabled={!form.nome || !form.telefone}
                className="w-full py-3 bg-primary-500 hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-on-primary rounded-xl text-sm font-bold transition-colors"
              >
                Cadastrar Cliente
              </button>

            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar CSV */}
      {csvModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={fecharCsvModal}>
          <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-success-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{csvImportados} contato{csvImportados !== 1 ? 's' : ''} importado{csvImportados !== 1 ? 's' : ''}!</p>
                  <p className="text-sm text-gray-400 mt-1">Os contatos já aparecem na sua lista.</p>
                  <button onClick={fecharCsvModal} className="mt-5 px-6 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-sm font-bold transition-colors">
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
                  <div className="flex items-center gap-2 bg-success-50 border border-success-100 rounded-xl p-3">
                    <CheckCircle2 size={15} className="text-success-500 shrink-0" />
                    <p className="text-xs font-semibold text-success-700">{csvData.rows.length} linha{csvData.rows.length !== 1 ? 's' : ''} encontrada{csvData.rows.length !== 1 ? 's' : ''} no arquivo</p>
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
                          <div className="flex items-center gap-2 text-warning-700 text-xs font-semibold bg-warning-50 border border-warning-100 rounded-xl px-3 py-2">
                            <AlertCircle size={14} className="shrink-0" /> Mapeie a coluna Nome para continuar
                          </div>
                        ) : (
                          <div className="bg-success-50 border border-success-100 rounded-xl px-3 py-2">
                            <p className="text-[11px] font-bold text-success-700">{comNome} contato{comNome !== 1 ? 's' : ''} válido{comNome !== 1 ? 's' : ''} para importar</p>
                            {semNome > 0 && <p className="text-[10px] text-warning-600 mt-0.5">{semNome} linha{semNome !== 1 ? 's' : ''} sem nome serão ignoradas</p>}
                          </div>
                        )}
                        <button
                          onClick={importarCSV}
                          disabled={nomeIdx < 0 || comNome === 0}
                          className="w-full py-3 bg-primary-500 hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-on-primary rounded-xl text-sm font-bold transition-colors"
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
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { setDetalhe(null); setBuscaVeiculo(''); setMostrarChecklistCliente(false); setChecklistClienteSalvo(false) }}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users size={16} className="text-gray-400" />
                </div>
                <span className="text-base font-bold text-gray-900">{detalhe.nome}</span>
              </div>
              <button
                onClick={() => { setDetalhe(null); setBuscaVeiculo(''); setMostrarChecklistCliente(false); setChecklistClienteSalvo(false) }}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Seção 1: Opções do cliente ── */}
              <div className="px-5 py-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Opções do cliente</h3>
                <p className="text-xs text-gray-400 mb-4">Ações rápidas que você pode realizar com este cliente</p>

                <div className="space-y-2.5">
                  {detalhe.telefone && (
                    <button
                      onClick={() => enviarWhatsApp(detalhe)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-success-500 hover:bg-success-600 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                    >
                      <MessageCircle size={18} />
                      Chamar no WhatsApp
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDetalhe(null)
                      navigate('/agenda', { state: { novoAgendamento: true, cliente: detalhe } })
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                  >
                    <CalendarDays size={18} />
                    Criar agendamento na agenda
                  </button>

                  <button
                    onClick={() => {
                      setDetalhe(null)
                      navigate('/vendas', { state: { novaVenda: true, cliente: detalhe } })
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                  >
                    <ShoppingCart size={18} />
                    Criar venda com cliente
                  </button>

                  <button
                    onClick={() => {
                      setDetalhe(null)
                      navigate('/vendas', { state: { novaPreVenda: true, cliente: detalhe } })
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                  >
                    <FileText size={18} />
                    Criar orçamento com cliente
                  </button>
                </div>
              </div>

              {/* ── Seção 2: Informações do cliente ── */}
              <div className="px-5 py-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Informações do cliente</h3>
                <p className="text-xs text-gray-400 mb-4">Dados de contato e informações pessoais do cliente</p>

                <div className="space-y-2.5">
                  {detalhe.telefone && (
                    <div className="flex items-center gap-2.5">
                      <MessageCircle size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-blue-500 font-medium">{detalhe.telefone}</span>
                    </div>
                  )}
                  {detalhe.email && (
                    <div className="flex items-center gap-2.5">
                      <Mail size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700">{detalhe.email}</span>
                    </div>
                  )}
                  {detalhe.cpf_cnpj && (
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700">{detalhe.cpf_cnpj}</span>
                    </div>
                  )}
                  {detalhe.endereco && (
                    <div className="flex items-center gap-2.5">
                      <MapPin size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700">{detalhe.endereco}</span>
                    </div>
                  )}
                  {detalhe.aniversario && (
                    <div className="flex items-center gap-2.5">
                      <Cake size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700">
                        {new Date(detalhe.aniversario + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {detalhe.observacoes && (
                    <div className="flex items-start gap-2.5">
                      <FileText size={16} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{detalhe.observacoes}</span>
                    </div>
                  )}
                </div>

                {/* Métricas */}
                {(() => {
                  const { totalGasto, qtdServicos } = getDadosCliente(detalhe)
                  return totalGasto > 0 || qtdServicos > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-success-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-success-600 font-medium mb-0.5">Total gasto</p>
                        <p className="text-base font-bold text-success-600">{fmt(totalGasto)}</p>
                      </div>
                      <div className="bg-violet-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-violet-600 font-medium mb-0.5">Serviços</p>
                        <p className="text-base font-bold text-violet-600">{qtdServicos}</p>
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Próximo agendamento */}
                {(() => {
                  const { proximoAg } = getDadosCliente(detalhe)
                  return proximoAg ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-3">
                      <p className="text-[10px] font-bold text-blue-600 mb-0.5">Próximo agendamento</p>
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
                  ) : null
                })()}
              </div>

              {/* ── Seção 3: Veículos do cliente ── */}
              <div className="px-5 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Veículos do cliente</h3>
                    <p className="text-xs text-gray-400">
                      {getVeiculosCliente(detalhe.id).length} veículo(s) cadastrado(s)
                    </p>
                  </div>
                  <button
                    onClick={() => { setVeiculoEditando(null); setVeiculoForm(initVeiculoForm()); setVeiculoModal(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus size={13} /> Novo veículo
                  </button>
                </div>

                {getVeiculosCliente(detalhe.id).length > 0 && (
                  <div className="relative my-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={buscaVeiculo}
                      onChange={(e) => setBuscaVeiculo(e.target.value)}
                      placeholder="Buscar por marca, modelo, placa ou ano..."
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}

                {getVeiculosCliente(detalhe.id).length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl mt-3">
                    <Car size={28} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Nenhum veículo cadastrado</p>
                    <button
                      onClick={() => { setVeiculoEditando(null); setVeiculoForm(initVeiculoForm()); setVeiculoModal(true) }}
                      className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700"
                    >
                      + Adicionar primeiro veículo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-3">
                    {getVeiculosCliente(detalhe.id)
                      .filter(v => {
                        const t = buscaVeiculo.toLowerCase()
                        return !t || v.placa.toLowerCase().includes(t) ||
                          v.modelo.toLowerCase().includes(t) ||
                          v.marca.toLowerCase().includes(t) ||
                          v.ano.includes(t)
                      })
                      .map(veiculo => (
                        <div key={veiculo.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-3 bg-gray-50">
                            <div className="flex items-center gap-3">
                              <Car size={20} className="text-danger-400 shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-gray-900 uppercase">{veiculo.placa}</p>
                                <p className="text-xs text-gray-500">
                                  {[veiculo.marca, veiculo.modelo, veiculo.ano].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              {veiculo.cor && (
                                <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">{veiculo.cor}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setVeiculoEditando(veiculo)
                                  setVeiculoForm({
                                    placa: veiculo.placa, modelo: veiculo.modelo,
                                    marca: veiculo.marca, ano: veiculo.ano,
                                    cor: veiculo.cor, observacoes: veiculo.observacoes,
                                  })
                                  setVeiculoModal(true)
                                }}
                                className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => removerVeiculo(veiculo)}
                                className="p-1.5 text-gray-400 hover:text-danger-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {veiculo.cor && (
                            <div className="px-3 py-1.5 border-t border-gray-100 flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full border border-gray-200"
                                style={{ backgroundColor: veiculo.cor }} />
                              <span className="text-xs text-gray-500">{veiculo.cor}</span>
                            </div>
                          )}

                          <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Fotos</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {(['frente', 'traseira', 'direita', 'esquerda'] as const).map(face => {
                                const url = veiculo[`foto_${face}`] as string | null
                                const isLoading = uploadingFaceVeiculo === `${veiculo.id}-${face}`
                                const labels = { frente: '⬆ Frente', traseira: '⬇ Traseira', direita: '➡ Direita', esquerda: '⬅ Esquerda' }
                                return (
                                  <div key={face} className="relative">
                                    {url ? (
                                      <div className="relative group">
                                        <img src={url} alt={face}
                                          className="w-full h-16 object-cover rounded-lg cursor-pointer border border-gray-200"
                                          onClick={() => setFotoAmpliada(url)} />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                          <label className="cursor-pointer p-1 bg-white/90 rounded-md">
                                            <Camera size={11} className="text-gray-700" />
                                            <input type="file" accept="image/*" capture="environment" className="hidden"
                                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFotoVeiculoNovo(veiculo, face, f) }} />
                                          </label>
                                          <button onClick={() => removerFotoVeiculoNovo(veiculo, face)}
                                            className="p-1 bg-danger-500/90 rounded-md">
                                            <X size={11} className="text-white" />
                                          </button>
                                        </div>
                                        <span className="absolute bottom-1 left-1 text-[8px] font-bold text-white bg-black/50 px-1 rounded">
                                          {labels[face].split(' ')[1]}
                                        </span>
                                      </div>
                                    ) : (
                                      <label className={`flex flex-col items-center justify-center h-16 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                                        isLoading ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50'
                                      }`}>
                                        {isLoading
                                          ? <Loader2 size={14} className="text-primary-500 animate-spin" />
                                          : <>
                                              <Camera size={14} className="text-gray-300 mb-0.5" />
                                              <span className="text-[8px] text-gray-300 text-center leading-tight px-0.5">
                                                {labels[face].split(' ')[1]}
                                              </span>
                                            </>
                                        }
                                        <input type="file" accept="image/*" capture="environment" className="hidden"
                                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFotoVeiculoNovo(veiculo, face, f) }} />
                                      </label>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* ── Seção 4: Histórico de serviços ── */}
              {(() => {
                const { vendasCliente } = getDadosCliente(detalhe)
                if (vendasCliente.length === 0) return null
                const historico = [...vendasCliente]
                  .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime())
                  .slice(0, 10)
                return (
                  <div className="px-5 py-5 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5">Histórico de serviços</h3>
                    <p className="text-xs text-gray-400 mb-4">{vendasCliente.length} serviço{vendasCliente.length !== 1 ? 's' : ''} realizado{vendasCliente.length !== 1 ? 's' : ''}</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {historico.map(v => (
                        <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">{v.descricao || 'Serviço'}</p>
                            <p className="text-[10px] text-gray-400">{new Date(v.data_venda).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <span className="text-xs font-bold text-success-600 shrink-0 ml-2">{fmt((v as any).valor_total || v.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* ── Seção 5: Checklist ── */}
              <div className="px-5 py-5 border-b border-gray-100">
                <div className={`border rounded-xl overflow-hidden ${mostrarChecklistCliente ? 'border-success-200' : 'border-gray-200'}`}>
                  <button
                    type="button"
                    onClick={() => setMostrarChecklistCliente(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={16} className={mostrarChecklistCliente ? 'text-success-500' : 'text-gray-400'} />
                      <span className="text-sm font-semibold text-gray-700">Novo checklist</span>
                      {checklistClienteSalvo && (
                        <span className="text-[10px] text-success-600 bg-success-50 px-2 py-0.5 rounded-full font-bold">✓ Salvo</span>
                      )}
                    </div>
                    {mostrarChecklistCliente ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {mostrarChecklistCliente && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <ChecklistEmbutido
                        nomeCliente={detalhe.nome}
                        placa={detalhe.placa || ''}
                        telefone={detalhe.telefone || ''}
                        onSalvo={() => {
                          setChecklistClienteSalvo(true)
                          setMostrarChecklistCliente(false)
                          toast.success('Checklist criado!')
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Rodapé: Excluir ── */}
              <div className="px-5 py-4">
                <button
                  onClick={() => remover(detalhe.id)}
                  className="w-full py-2.5 border border-danger-200 text-danger-500 hover:bg-danger-50 rounded-xl text-xs font-bold transition-colors"
                >
                  Excluir cliente
                </button>
              </div>

            </div>

            {/* Footer fixo — Editar */}
            <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setEditandoId(detalhe.id)
                  setForm({
                    nome: detalhe.nome,
                    telefone: detalhe.telefone || '',
                    email: detalhe.email || '',
                    cpf_cnpj: detalhe.cpf_cnpj || '',
                    veiculo: detalhe.veiculo || '',
                    placa: detalhe.placa || '',
                    endereco: detalhe.endereco || '',
                    aniversario: detalhe.aniversario || '',
                    observacoes: detalhe.observacoes || '',
                  })
                  setDetalhe(null)
                  setModal(true)
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-success-500 hover:bg-success-600 text-white rounded-xl text-sm font-bold transition-colors active:scale-[0.98]"
              >
                <Pencil size={16} />
                Editar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Veículo */}
      {veiculoModal && detalhe && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { setVeiculoModal(false); setVeiculoForm(initVeiculoForm()); setVeiculoEditando(null) }}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {veiculoEditando ? 'Editar veículo' : 'Novo veículo'}
              </h2>
              <button onClick={() => { setVeiculoModal(false); setVeiculoForm(initVeiculoForm()); setVeiculoEditando(null) }}
                className="p-1.5 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Placa <span className="text-danger-400">*</span>
                </label>
                <input type="text"
                  value={veiculoForm.placa}
                  onChange={e => setVeiculoForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234"
                  maxLength={8}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Marca</label>
                  <input type="text"
                    value={veiculoForm.marca}
                    onChange={e => setVeiculoForm(f => ({ ...f, marca: e.target.value }))}
                    placeholder="Ex: Honda"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Modelo</label>
                  <input type="text"
                    value={veiculoForm.modelo}
                    onChange={e => setVeiculoForm(f => ({ ...f, modelo: e.target.value }))}
                    placeholder="Ex: Civic EXL"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano</label>
                  <input type="text"
                    value={veiculoForm.ano}
                    onChange={e => setVeiculoForm(f => ({ ...f, ano: e.target.value }))}
                    placeholder="Ex: 2022"
                    maxLength={4}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cor</label>
                  <input type="text"
                    value={veiculoForm.cor}
                    onChange={e => setVeiculoForm(f => ({ ...f, cor: e.target.value }))}
                    placeholder="Ex: Preto"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea
                  value={veiculoForm.observacoes}
                  onChange={e => setVeiculoForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Observações sobre o veículo..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={salvarVeiculo}
                disabled={!veiculoForm.placa}
                className="w-full py-3 bg-primary-500 hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-on-primary rounded-xl text-sm font-bold transition-colors"
              >
                {veiculoEditando ? 'Salvar alterações' : 'Adicionar veículo'}
              </button>
            </div>

          </div>
        </div>
      )}

      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <img
            src={fotoAmpliada}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  )
}
