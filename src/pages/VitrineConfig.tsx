import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Store, Eye, EyeOff, Save, Copy, Check, ExternalLink,
  Globe, Phone, Mail, MapPin, Instagram, Facebook, Music2,
  Clock, Calendar, GripVertical, Image, Loader2, Link2,
} from 'lucide-react'
import toast from '../lib/toast'
import { useAuth } from '../contexts/AuthContext'
import { useBrand } from '../contexts/BrandContext'
import { useCloudSyncSingle } from '../hooks/useCloudSync'
import { supabase } from '../lib/supabase'
import type { Servico } from '../types'
import type { VitrineConfig, VitrineServico } from '../types/vitrine'
import { VITRINE_CONFIG_DEFAULT } from '../types/vitrine'

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function VitrineConfig() {
  const { user } = useAuth()
  const { brand } = useBrand()
  const { data: config, update: updateConfig, loading } = useCloudSyncSingle<VitrineConfig>({
    table: 'vitrine_config',
    storageKey: 'vitrine_config',
    defaultValue: VITRINE_CONFIG_DEFAULT,
  })

  const [servicos, setServicos] = useState<Servico[]>([])
  const [vitrineServicos, setVitrineServicos] = useState<VitrineServico[]>([])
  const [loadingServicos, setLoadingServicos] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'perfil' | 'servicos' | 'agendamento'>('perfil')

  // Preencher dados do brand se vitrine estiver vazia
  useEffect(() => {
    if (!loading && config.nome_empresa === '' && brand.nome_empresa) {
      updateConfig({
        nome_empresa: brand.nome_empresa,
        slogan: brand.slogan || '',
        telefone: brand.telefone || '',
        email: brand.email || '',
        endereco: brand.endereco || '',
        logo_url: brand.logo_url || '',
        cor_primaria: brand.cor_primaria || '#CFFF04',
        cor_secundaria: brand.cor_secundaria || '#0d0d1a',
        slug: config.slug || slugify(brand.nome_empresa),
      })
    }
  }, [loading, brand]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar serviços
  useEffect(() => {
    if (!user) return
    const loadServicos = async () => {
      const { data } = await supabase.from('servicos').select('*').eq('user_id', user.id)
      setServicos(data || [])

      const { data: vs } = await supabase.from('vitrine_servicos').select('*').eq('user_id', user.id)
      setVitrineServicos(vs || [])
      setLoadingServicos(false)
    }
    loadServicos()
  }, [user])

  const toggleServico = useCallback(async (servico: Servico) => {
    if (!user) return
    const existing = vitrineServicos.find(vs => vs.servico_id === servico.id)
    if (existing) {
      await supabase.from('vitrine_servicos').delete().eq('id', existing.id)
      setVitrineServicos(prev => prev.filter(vs => vs.id !== existing.id))
      toast.success(`"${servico.nome}" removido da vitrine`)
    } else {
      const novo = {
        user_id: user.id,
        servico_id: servico.id,
        visivel: true,
        ordem: vitrineServicos.length,
        preco_vitrine: null,
      }
      const { data, error } = await supabase.from('vitrine_servicos').insert(novo).select().single()
      if (error) { toast.error('Erro ao adicionar'); return }
      setVitrineServicos(prev => [...prev, data])
      toast.success(`"${servico.nome}" adicionado à vitrine`)
    }
  }, [user, vitrineServicos])

  const servicosNaVitrine = useMemo(() => {
    const ids = new Set(vitrineServicos.filter(vs => vs.visivel).map(vs => vs.servico_id))
    return servicos.filter(s => ids.has(s.id))
  }, [servicos, vitrineServicos])

  const vitrineUrl = useMemo(() => {
    if (!config.slug) return ''
    return `${window.location.origin}/v/${config.slug}`
  }, [config.slug])

  const handleCopyLink = () => {
    if (!vitrineUrl) return
    navigator.clipboard.writeText(vitrineUrl)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!config.slug) {
      toast.error('Defina um slug para sua vitrine')
      return
    }
    setSaving(true)
    await updateConfig({ ...config, updated_at: new Date().toISOString() })
    setSaving(false)
    toast.success('Vitrine salva!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Store size={24} className="text-primary-500" />
            <h1 className="text-2xl font-bold text-gray-900">Vitrine Digital</h1>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Configure sua página pública com catálogo e agendamento</p>
        </div>
        <div className="flex items-center gap-2">
          {vitrineUrl && (
            <>
              <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
              <a href={vitrineUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors">
                <ExternalLink size={14} /> Visualizar
              </a>
            </>
          )}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl p-4 flex items-center justify-between ${config.ativo ? 'bg-success-50 border border-success-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.ativo ? 'bg-success-100' : 'bg-gray-200'}`}>
            {config.ativo ? <Eye size={20} className="text-success-600" /> : <EyeOff size={20} className="text-gray-500" />}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{config.ativo ? 'Vitrine ativa' : 'Vitrine desativada'}</p>
            <p className="text-[11px] text-gray-500">{config.ativo ? 'Visível para qualquer pessoa com o link' : 'Ninguém pode acessar sua vitrine'}</p>
          </div>
        </div>
        <button
          onClick={() => updateConfig({ ativo: !config.ativo })}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${config.ativo ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-success-500 text-white hover:bg-success-600'}`}
        >
          {config.ativo ? 'Desativar' : 'Ativar'}
        </button>
      </div>

      {/* Link + QR Code */}
      {config.slug && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Link da vitrine</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <Globe size={14} className="text-primary-500 shrink-0" />
                <p className="text-sm text-primary-600 font-medium truncate">{vitrineUrl}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold transition-colors flex-1">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <a href={vitrineUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors">
                  <ExternalLink size={14} /> Abrir
                </a>
              </div>
              <p className="text-[10px] text-gray-400">Compartilhe este link nas redes sociais, no cartão de visitas ou imprima o QR Code.</p>
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(vitrineUrl)}&bgcolor=ffffff&color=000000&margin=8`}
                alt="QR Code"
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl border border-gray-200"
              />
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(vitrineUrl)}&bgcolor=ffffff&color=000000&margin=16&format=png`}
                download={`vitrine-${config.slug}-qr.png`}
                className="text-[10px] font-bold text-primary-600 hover:underline"
              >
                Baixar QR em alta resolução
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { value: 'perfil' as const, label: 'Perfil', icon: Store },
          { value: 'servicos' as const, label: `Serviços (${servicosNaVitrine.length})`, icon: GripVertical },
          { value: 'agendamento' as const, label: 'Agendamento', icon: Calendar },
        ]).map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {tab === 'perfil' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Dados da empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome da empresa *</label>
                <input type="text" value={config.nome_empresa} onChange={e => updateConfig({ nome_empresa: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Slug (URL) *</label>
                <div className="flex">
                  <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs text-gray-400">/v/</span>
                  <input type="text" value={config.slug} onChange={e => updateConfig({ slug: slugify(e.target.value) })} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-r-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="minha-empresa" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Slogan</label>
              <input type="text" value={config.slogan} onChange={e => updateConfig({ slogan: e.target.value })} placeholder="Sua frase de destaque" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição</label>
              <textarea value={config.descricao} onChange={e => updateConfig({ descricao: e.target.value })} rows={3} placeholder="Fale sobre sua empresa, diferenciais, experiência..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Contato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Phone size={12} /> Telefone</label>
                <input type="tel" value={config.telefone} onChange={e => updateConfig({ telefone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Phone size={12} /> WhatsApp</label>
                <input type="tel" value={config.whatsapp} onChange={e => updateConfig({ whatsapp: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Mail size={12} /> E-mail</label>
                <input type="email" value={config.email} onChange={e => updateConfig({ email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><MapPin size={12} /> Endereço</label>
                <input type="text" value={config.endereco} onChange={e => updateConfig({ endereco: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Cidade</label>
                <input type="text" value={config.cidade} onChange={e => updateConfig({ cidade: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Estado</label>
                <input type="text" value={config.estado} onChange={e => updateConfig({ estado: e.target.value })} placeholder="SP" maxLength={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Redes sociais</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Instagram size={12} /> Instagram</label>
                <input type="url" value={config.instagram_url} onChange={e => updateConfig({ instagram_url: e.target.value })} placeholder="https://instagram.com/sua-empresa" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Facebook size={12} /> Facebook</label>
                <input type="url" value={config.facebook_url} onChange={e => updateConfig({ facebook_url: e.target.value })} placeholder="https://facebook.com/sua-empresa" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Music2 size={12} /> TikTok</label>
                <input type="url" value={config.tiktok_url} onChange={e => updateConfig({ tiktok_url: e.target.value })} placeholder="https://tiktok.com/@sua-empresa" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Imagens</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Logo (URL)</label>
                <input type="url" value={config.logo_url} onChange={e => updateConfig({ logo_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                {config.logo_url && (
                  <div className="mt-2 w-16 h-16 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Banner (URL)</label>
                <input type="url" value={config.banner_url} onChange={e => updateConfig({ banner_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                {config.banner_url && (
                  <div className="mt-2 w-full h-20 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <img src={config.banner_url} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Serviços */}
      {tab === 'servicos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Selecione os serviços para exibir</h3>
            <p className="text-[11px] text-gray-400 mb-4">Marque os serviços que aparecerão na sua vitrine pública</p>

            {loadingServicos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : servicos.length === 0 ? (
              <div className="text-center py-8">
                <Image size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">Nenhum serviço cadastrado</p>
                <p className="text-xs text-gray-400">Cadastre serviços na página de Serviços primeiro</p>
              </div>
            ) : (
              <div className="space-y-2">
                {servicos.map(s => {
                  const naVitrine = vitrineServicos.some(vs => vs.servico_id === s.id && vs.visivel)
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleServico(s)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${naVitrine ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${naVitrine ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                        {naVitrine && <Check size={12} className="text-white" />}
                      </div>
                      {s.foto_url ? (
                        <img src={s.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <Image size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.nome}</p>
                        {s.descricao && <p className="text-[11px] text-gray-400 truncate">{s.descricao}</p>}
                      </div>
                      <p className="text-sm font-bold text-gray-700 shrink-0">
                        {s.preco_padrao > 0 ? `R$ ${s.preco_padrao.toFixed(2)}` : 'Consultar'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
            <p className="text-xs text-primary-700">
              <strong>{servicosNaVitrine.length}</strong> serviço{servicosNaVitrine.length !== 1 ? 's' : ''} aparecerão na sua vitrine pública.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Agendamento */}
      {tab === 'agendamento' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Agendamento online</h3>
              <button
                onClick={() => updateConfig({ aceita_agendamento: !config.aceita_agendamento })}
                className={`relative w-11 h-6 rounded-full transition-colors ${config.aceita_agendamento ? 'bg-primary-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.aceita_agendamento ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              {config.aceita_agendamento
                ? 'Clientes podem agendar diretamente pela vitrine'
                : 'Agendamento desativado — clientes só verão o catálogo'}
            </p>
          </div>

          {config.aceita_agendamento && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Clock size={14} /> Horário de atendimento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Início</label>
                    <input type="time" value={config.horario_inicio} onChange={e => updateConfig({ horario_inicio: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Fim</label>
                    <input type="time" value={config.horario_fim} onChange={e => updateConfig({ horario_fim: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Intervalo entre horários (min)</label>
                  <select value={config.intervalo_min} onChange={e => updateConfig({ intervalo_min: parseInt(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h30</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Antecedência máxima (dias)</label>
                  <input type="number" value={config.antecedencia_max_dias} onChange={e => updateConfig({ antecedencia_max_dias: parseInt(e.target.value) || 30 })} min={1} max={90} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Calendar size={14} /> Dias de funcionamento</h3>
                <div className="flex gap-2">
                  {DIAS_SEMANA.map(dia => {
                    const ativo = (config.dias_semana || []).includes(dia.value)
                    return (
                      <button
                        key={dia.value}
                        onClick={() => {
                          const novos = ativo
                            ? config.dias_semana.filter(d => d !== dia.value)
                            : [...config.dias_semana, dia.value].sort()
                          updateConfig({ dias_semana: novos })
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${ativo ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >
                        {dia.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
