import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone, MessageSquare, Plus, ToggleLeft, ToggleRight, Loader2,
  RefreshCw, AlertTriangle, Info, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import toast from '../../lib/toast'

type Tab = 'banners' | 'mensagens'

interface Banner {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'aviso' | 'critico'
  ativo: boolean
  expires_at: string | null
  created_at: string
}

interface MensagemRecente {
  id: string
  assunto: string
  corpo: string
  lida: boolean
  created_at: string
  target_email: string
  target_nome: string
  target_user_id: string
}

const TIPO_ICON: Record<string, any> = { info: Info, aviso: AlertTriangle, critico: AlertCircle }
const TIPO_STYLE: Record<string, { bg: string; text: string }> = {
  info: { bg: 'bg-blue-50', text: 'text-blue-700' },
  aviso: { bg: 'bg-warning-50', text: 'text-warning-700' },
  critico: { bg: 'bg-danger-50', text: 'text-danger-700' },
}

export default function AdminComunicacao() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('banners')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Comunicação</h1>
        <p className="text-sm text-gray-400 mt-0.5">Banners globais e mensagens diretas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('banners')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'banners' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Megaphone size={14} /> Banners
        </button>
        <button
          onClick={() => setTab('mensagens')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'mensagens' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare size={14} /> Mensagens
        </button>
      </div>

      {tab === 'banners' && <BannersTab />}
      {tab === 'mensagens' && <MensagensTab navigate={navigate} />}
    </div>
  )
}

// ============ Banners Tab ============
function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', mensagem: '', tipo: 'info' as string })
  const [submitting, setSubmitting] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_listar_banners')
      if (error) throw error
      setBanners((data as Banner[]) || [])
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar banners')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const criar = async () => {
    if (!form.titulo.trim()) { toast.error('Preencha o título'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('admin_criar_banner', {
        p_titulo: form.titulo.trim(),
        p_mensagem: form.mensagem.trim(),
        p_tipo: form.tipo,
      })
      if (error) throw error
      toast.success('Banner criado')
      setForm({ titulo: '', mensagem: '', tipo: 'info' })
      setShowForm(false)
      carregar()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao criar banner')
    } finally {
      setSubmitting(false)
    }
  }

  const toggle = async (b: Banner) => {
    try {
      const { error } = await supabase.rpc('admin_toggle_banner', { p_id: b.id, p_ativo: !b.ativo })
      if (error) throw error
      setBanners(prev => prev.map(x => x.id === b.id ? { ...x, ativo: !x.ativo } : x))
      toast.success(b.ativo ? 'Banner desativado' : 'Banner ativado')
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao alterar banner')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{banners.length} banner{banners.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <button onClick={carregar} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800">
            <Plus size={12} /> Novo banner
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <input
            type="text"
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Título do banner"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-warning-500"
          />
          <textarea
            value={form.mensagem}
            onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
            placeholder="Mensagem (opcional)"
            rows={2}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-warning-500 resize-none"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Tipo:</label>
            {(['info', 'aviso', 'critico'] as const).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, tipo: t }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize ${
                  form.tipo === t ? TIPO_STYLE[t].bg + ' ' + TIPO_STYLE[t].text : 'bg-gray-100 text-gray-400'
                }`}
              >
                {t === 'critico' ? 'Crítico' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={criar} disabled={submitting} className="px-4 py-2 bg-warning-500 text-white rounded-lg text-xs font-bold hover:bg-warning-600 disabled:opacity-40">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Publicar'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Nenhum banner criado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map(b => {
            const Icon = TIPO_ICON[b.tipo] || Info
            const st = TIPO_STYLE[b.tipo] || TIPO_STYLE.info
            return (
              <div key={b.id} className={`flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 ${!b.ativo ? 'opacity-50' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${st.bg} shrink-0`}>
                  <Icon size={16} className={st.text} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{b.titulo}</p>
                  {b.mensagem && <p className="text-[11px] text-gray-400 truncate">{b.mensagem}</p>}
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {format(new Date(b.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    {b.expires_at && ` · Expira ${format(new Date(b.expires_at), 'dd/MM/yyyy')}`}
                  </p>
                </div>
                <button onClick={() => toggle(b)} className="shrink-0 p-1">
                  {b.ativo ? (
                    <ToggleRight size={24} className="text-success-500" />
                  ) : (
                    <ToggleLeft size={24} className="text-gray-300" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============ Mensagens Tab ============
function MensagensTab({ navigate }: { navigate: (p: string) => void }) {
  const [mensagens, setMensagens] = useState<MensagemRecente[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_listar_mensagens_recentes', { p_limit: 30, p_offset: 0 })
      if (error) throw error
      setMensagens((data as MensagemRecente[]) || [])
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{mensagens.length} mensagen{mensagens.length !== 1 ? 's' : ''} recente{mensagens.length !== 1 ? 's' : ''}</p>
        <button onClick={carregar} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : mensagens.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Nenhuma mensagem enviada</p>
          <p className="text-xs text-gray-400 mt-1">Envie mensagens pela tela de detalhe da conta</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Destinatário</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Assunto</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase hidden md:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {mensagens.map(m => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/admin/contas/${m.target_user_id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-900 truncate max-w-[160px]">{m.target_nome || m.target_email}</p>
                    {m.target_nome && <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{m.target_email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700 truncate max-w-[200px]">{m.assunto}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.lida ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                      {m.lida ? 'Lida' : 'Não lida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[10px] text-gray-400">{format(new Date(m.created_at), 'dd/MM HH:mm')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
