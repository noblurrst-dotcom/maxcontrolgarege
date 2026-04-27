import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Users, ShoppingCart, CalendarDays, Briefcase, DollarSign,
  Headphones, Ban, CheckCircle2, Loader2, Clock, Shield, MessageSquare, Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface ContaInfo {
  id: string
  email: string
  cadastro: string
  ultimo_acesso: string | null
  status: string
  banned_until: string | null
}

interface BrandInfo {
  nome_empresa: string | null
  slogan: string | null
  cor_primaria: string | null
  cor_secundaria: string | null
  logo_url: string | null
  nome_usuario: string | null
}

interface Contagens {
  total_clientes: number
  total_vendas: number
  total_agendamentos: number
  total_servicos: number
  total_financeiro: number
}

interface AuditEntry {
  id: string
  acao: string
  detalhes: any
  created_at: string
  admin_email: string
}

interface DetalheData {
  conta: ContaInfo
  brand: BrandInfo | null
  contagens: Contagens
  ultimas_vendas: any[]
  ultimos_agendamentos: any[]
  audit_log: AuditEntry[]
}

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  ativa: { label: 'Ativa', bg: 'bg-success-100', text: 'text-success-700' },
  dormente: { label: 'Dormente', bg: 'bg-warning-100', text: 'text-warning-700' },
  inativa: { label: 'Inativa', bg: 'bg-gray-100', text: 'text-gray-600' },
  nunca_logou: { label: 'Nunca logou', bg: 'bg-blue-100', text: 'text-blue-700' },
  suspensa: { label: 'Suspensa', bg: 'bg-danger-100', text: 'text-danger-700' },
}

const ACAO_LABELS: Record<string, string> = {
  ver_detalhe_conta: 'Visualizou detalhe',
  suspender_conta: 'Suspendeu conta',
  reativar_conta: 'Reativou conta',
  gerar_support_code: 'Gerou código de suporte',
}

export default function AdminContaDetalhe() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<DetalheData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [mensagens, setMensagens] = useState<any[]>([])
  const [msgForm, setMsgForm] = useState({ assunto: '', corpo: '' })
  const [msgSending, setMsgSending] = useState(false)
  const [showMsgForm, setShowMsgForm] = useState(false)

  const carregar = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: result, error } = await supabase.rpc('admin_detalhe_conta', { p_user_id: userId })
      if (error) throw error
      setData(result as DetalheData)
    } catch (err: any) {
      console.error('Erro ao carregar detalhe:', err)
      toast.error('Erro ao carregar detalhe da conta')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { carregar() }, [carregar])

  const carregarMensagens = useCallback(async () => {
    if (!userId) return
    try {
      const { data: result, error } = await supabase.rpc('admin_listar_mensagens_conta', { p_user_id: userId })
      if (error) throw error
      setMensagens((result as any[]) || [])
    } catch { /* silent */ }
  }, [userId])

  useEffect(() => { carregarMensagens() }, [carregarMensagens])

  const enviarMensagem = async () => {
    if (!userId || !msgForm.assunto.trim()) { toast.error('Preencha o assunto'); return }
    setMsgSending(true)
    try {
      const { error } = await supabase.rpc('admin_enviar_mensagem', {
        p_target_user_id: userId,
        p_assunto: msgForm.assunto.trim(),
        p_corpo: msgForm.corpo.trim(),
      })
      if (error) throw error
      toast.success('Mensagem enviada')
      setMsgForm({ assunto: '', corpo: '' })
      setShowMsgForm(false)
      carregarMensagens()
      carregar() // refresh audit
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao enviar mensagem')
    } finally {
      setMsgSending(false)
    }
  }

  const suspenderReativar = async () => {
    if (!data?.conta || !userId) return
    const isSuspensa = data.conta.status === 'suspensa'
    const acao = isSuspensa ? 'reativar' : 'suspender'
    const msg = isSuspensa ? 'Reativar esta conta?' : 'Suspender esta conta? O usuário não poderá fazer login.'
    if (!confirm(msg)) return

    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('admin_suspender_conta', { p_user_id: userId, p_acao: acao })
      if (error) throw error
      toast.success(isSuspensa ? 'Conta reativada' : 'Conta suspensa')
      carregar()
    } catch (err: any) {
      console.error('Erro:', err)
      toast.error('Erro ao executar ação')
    } finally {
      setActionLoading(false)
    }
  }

  const gerarSupportCode = async () => {
    if (!userId) return
    setGerando(true)
    try {
      const { data: result, error } = await supabase.rpc('admin_gerar_support_code', { p_target_user_id: userId })
      if (error) throw error
      const r = result as { code: string }
      window.open(`/admin/suporte?code=${r.code}`, '_blank')
      toast.success(`Código gerado: ${r.code}`)
      carregar()
    } catch (err: any) {
      console.error('Erro:', err)
      toast.error('Erro ao gerar código')
    } finally {
      setGerando(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!data?.conta) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Conta não encontrada</p>
        <button onClick={() => navigate('/admin/contas')} className="text-sm text-warning-600 mt-2 hover:underline">
          ← Voltar à lista
        </button>
      </div>
    )
  }

  const { conta, brand, contagens } = data
  const st = STATUS_STYLE[conta.status] || STATUS_STYLE.inativa
  const nome = brand?.nome_empresa || conta.email
  const isSuspensa = conta.status === 'suspensa'

  return (
    <div className="space-y-6">
      {/* Voltar */}
      <button onClick={() => navigate('/admin/contas')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ChevronLeft size={16} /> Voltar à lista
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: brand?.cor_primaria || '#6b7280' }}>
                {nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">{nome}</h1>
              {brand?.nome_empresa && <p className="text-sm text-gray-400">{conta.email}</p>}
              {brand?.slogan && <p className="text-xs text-gray-400 mt-0.5">{brand.slogan}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                <span className="text-[10px] text-gray-400">
                  Cadastro: {conta.cadastro ? format(new Date(conta.cadastro), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                </span>
                <span className="text-[10px] text-gray-400">
                  Último acesso: {conta.ultimo_acesso ? format(new Date(conta.ultimo_acesso), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={gerarSupportCode}
              disabled={gerando}
              className="flex items-center gap-1.5 px-3 py-2 bg-warning-50 text-warning-700 rounded-lg text-xs font-bold hover:bg-warning-100 transition-colors disabled:opacity-40"
            >
              {gerando ? <Loader2 size={14} className="animate-spin" /> : <Headphones size={14} />}
              Entrar como suporte
            </button>
            <button
              onClick={suspenderReativar}
              disabled={actionLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${
                isSuspensa
                  ? 'bg-success-50 text-success-700 hover:bg-success-100'
                  : 'bg-danger-50 text-danger-600 hover:bg-danger-100'
              }`}
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : isSuspensa ? <CheckCircle2 size={14} /> : <Ban size={14} />}
              {isSuspensa ? 'Reativar' : 'Suspender'}
            </button>
          </div>
        </div>
      </div>

      {/* Contagens */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <CountCard icon={Users} label="Clientes" value={contagens.total_clientes} />
        <CountCard icon={ShoppingCart} label="Vendas" value={contagens.total_vendas} />
        <CountCard icon={CalendarDays} label="Agendamentos" value={contagens.total_agendamentos} />
        <CountCard icon={Briefcase} label="Serviços" value={contagens.total_servicos} />
        <CountCard icon={DollarSign} label="Financeiro" value={contagens.total_financeiro} />
      </div>

      {/* Atividade recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimas vendas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Últimas vendas</h3>
          {data.ultimas_vendas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma venda</p>
          ) : (
            <div className="space-y-2">
              {data.ultimas_vendas.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{v.descricao || 'Sem descrição'}</p>
                    <p className="text-[10px] text-gray-400">{v.created_at ? format(new Date(v.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-900 shrink-0 ml-3">R$ {(v.valor_total || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos agendamentos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Últimos agendamentos</h3>
          {data.ultimos_agendamentos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum agendamento</p>
          ) : (
            <div className="space-y-2">
              {data.ultimos_agendamentos.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{a.nome_cliente || 'Cliente'} — {a.servico || 'Serviço'}</p>
                    <p className="text-[10px] text-gray-400">{a.data_hora ? format(new Date(a.data_hora), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-gray-900">Mensagens</h3>
            {mensagens.length > 0 && <span className="text-[10px] text-gray-400">({mensagens.length})</span>}
          </div>
          <button
            onClick={() => setShowMsgForm(!showMsgForm)}
            className="text-xs font-bold text-warning-600 hover:text-warning-700"
          >
            {showMsgForm ? 'Cancelar' : '+ Nova mensagem'}
          </button>
        </div>

        {showMsgForm && (
          <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded-xl">
            <input
              type="text"
              value={msgForm.assunto}
              onChange={e => setMsgForm(f => ({ ...f, assunto: e.target.value }))}
              placeholder="Assunto"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-warning-500"
            />
            <textarea
              value={msgForm.corpo}
              onChange={e => setMsgForm(f => ({ ...f, corpo: e.target.value }))}
              placeholder="Corpo da mensagem"
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-warning-500 resize-none"
            />
            <button
              onClick={enviarMensagem}
              disabled={msgSending}
              className="flex items-center gap-1.5 px-4 py-2 bg-warning-500 text-white rounded-lg text-xs font-bold hover:bg-warning-600 disabled:opacity-40"
            >
              {msgSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
        )}

        {mensagens.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem enviada</p>
        ) : (
          <div className="space-y-2">
            {mensagens.map((m: any) => (
              <div key={m.id} className={`py-2 border-b border-gray-50 last:border-0 ${!m.lida ? 'bg-blue-50/30 -mx-2 px-2 rounded-lg' : ''}`}>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-900">{m.assunto}</p>
                  {!m.lida && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                </div>
                {m.corpo && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{m.corpo}</p>}
                <p className="text-[10px] text-gray-300 mt-1">{m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit log */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">Registro de ações administrativas</h3>
        </div>
        {data.audit_log.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma ação registrada</p>
        ) : (
          <div className="space-y-2">
            {data.audit_log.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <Clock size={14} className="text-gray-300 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700">
                    {ACAO_LABELS[entry.acao] || entry.acao}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    por {entry.admin_email} — {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                  {entry.detalhes && Object.keys(entry.detalhes).length > 0 && (
                    <p className="text-[10px] text-gray-300 mt-0.5 font-mono">{JSON.stringify(entry.detalhes)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ID técnico */}
      <p className="text-[10px] text-gray-300 text-center font-mono select-all">{userId}</p>
    </div>
  )
}

function CountCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
      <Icon size={18} className="text-gray-300 mx-auto mb-1.5" />
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
    </div>
  )
}
