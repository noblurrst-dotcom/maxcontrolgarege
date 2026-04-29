import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Phone, Mail, MapPin, Instagram, MessageCircle,
  Clock, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, Star, Send, Store,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { VitrineConfig, VitrineServico } from '../types/vitrine'
import type { Servico } from '../types'

// =====================================================================
// Helpers
// =====================================================================

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function gerarSlots(
  dia: Date,
  inicio: string,
  fim: string,
  intervaloMin: number,
  agendamentos: { data_hora: string; data_hora_fim: string }[],
  duracaoServico: number
): string[] {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fim.split(':').map(Number)
  const startMin = hi * 60 + mi
  const endMin = hf * 60 + mf
  const slots: string[] = []

  for (let m = startMin; m + duracaoServico <= endMin; m += intervaloMin) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    const slotStart = new Date(dia)
    slotStart.setHours(h, mm, 0, 0)
    const slotEnd = new Date(slotStart)
    slotEnd.setMinutes(slotEnd.getMinutes() + duracaoServico)

    // Verificar conflito
    const conflito = agendamentos.some(ag => {
      const agStart = new Date(ag.data_hora)
      const agEnd = new Date(ag.data_hora_fim)
      return slotStart < agEnd && slotEnd > agStart
    })

    // Não mostrar slots no passado
    if (slotStart <= new Date()) continue
    if (!conflito) slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
  }
  return slots
}

// =====================================================================
// Componente principal
// =====================================================================

type Etapa = 'catalogo' | 'agendar' | 'confirmado'

export default function VitrinePublica() {
  const { slug } = useParams<{ slug: string }>()

  const [config, setConfig] = useState<VitrineConfig | null>(null)
  const [servicos, setServicos] = useState<(Servico & { preco_vitrine?: number | null })[]>([])
  const [agendamentos, setAgendamentos] = useState<{ data_hora: string; data_hora_fim: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fluxo de agendamento
  const [etapa, setEtapa] = useState<Etapa>('catalogo')
  const [servicoSelecionado, setServicoSelecionado] = useState<(Servico & { preco_vitrine?: number | null }) | null>(null)
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(new Date())
  const [horaSelecionada, setHoraSelecionada] = useState('')
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', email: '', placa: '', veiculo: '', observacoes: '' })
  const [enviando, setEnviando] = useState(false)

  // Carregar dados da vitrine
  useEffect(() => {
    if (!slug) return
    const load = async () => {
      setLoading(true)
      // Config
      const { data: cfg, error: errCfg } = await supabase
        .from('vitrine_config')
        .select('*')
        .eq('slug', slug)
        .eq('ativo', true)
        .single()
      if (errCfg || !cfg) {
        setError('Vitrine não encontrada')
        setLoading(false)
        return
      }
      setConfig(cfg as VitrineConfig)

      // Serviços publicados
      const { data: vs } = await supabase
        .from('vitrine_servicos')
        .select('*')
        .eq('user_id', cfg.user_id)
        .eq('visivel', true)
        .order('ordem')
      const vitrineServicos = (vs || []) as VitrineServico[]

      if (vitrineServicos.length > 0) {
        const ids = vitrineServicos.map(v => v.servico_id)
        const { data: svcs } = await supabase
          .from('servicos')
          .select('*')
          .eq('user_id', cfg.user_id)
          .in('id', ids)
        const svcsMap = new Map((svcs || []).map(s => [s.id, s]))
        const merged = vitrineServicos
          .map(vs => {
            const svc = svcsMap.get(vs.servico_id)
            if (!svc) return null
            return { ...svc, preco_vitrine: vs.preco_vitrine }
          })
          .filter(Boolean) as (Servico & { preco_vitrine?: number | null })[]
        setServicos(merged)
      }

      // Agendamentos existentes (para calcular slots livres)
      const hoje = new Date()
      const limite = new Date()
      limite.setDate(limite.getDate() + (cfg.antecedencia_max_dias || 30))
      const { data: ags } = await supabase
        .from('agendamentos')
        .select('data_hora, data_hora_fim')
        .eq('user_id', cfg.user_id)
        .gte('data_hora', hoje.toISOString())
        .lte('data_hora', limite.toISOString())
        .neq('status', 'cancelado')

      // Também carregar agendamentos da vitrine
      const { data: vags } = await supabase
        .from('vitrine_agendamentos')
        .select('data_hora, data_hora_fim')
        .eq('user_id', cfg.user_id)
        .gte('data_hora', hoje.toISOString())
        .neq('status', 'cancelado')

      setAgendamentos([...(ags || []), ...(vags || [])])
      setLoading(false)
    }
    load()
  }, [slug])

  // Dias da semana visíveis
  const diasVisiveis = useMemo(() => {
    if (!config) return []
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const inicio = addDays(hoje, semanaOffset * 7)
    const dias: Date[] = []
    const maxDias = config.antecedencia_max_dias || 30
    for (let i = 0; i < 7; i++) {
      const d = addDays(inicio, i)
      if (d < hoje) continue
      if (d > addDays(hoje, maxDias)) continue
      const dow = d.getDay()
      if ((config.dias_semana || []).includes(dow)) dias.push(d)
    }
    return dias
  }, [config, semanaOffset])

  const slotsDisponiveis = useMemo(() => {
    if (!config || !servicoSelecionado || !diaSelecionado) return []
    const duracao = 60 // duração padrão do serviço em minutos
    return gerarSlots(
      diaSelecionado,
      config.horario_inicio,
      config.horario_fim,
      config.intervalo_min,
      agendamentos,
      duracao
    )
  }, [config, servicoSelecionado, diaSelecionado, agendamentos])

  const handleAgendar = async () => {
    if (!config || !servicoSelecionado || !horaSelecionada || !formCliente.nome || !formCliente.telefone) return
    setEnviando(true)

    const [h, m] = horaSelecionada.split(':').map(Number)
    const dataHora = new Date(diaSelecionado)
    dataHora.setHours(h, m, 0, 0)
    const dataHoraFim = new Date(dataHora)
    dataHoraFim.setMinutes(dataHoraFim.getMinutes() + 60)

    const preco = servicoSelecionado.preco_vitrine ?? servicoSelecionado.preco_padrao ?? 0

    const { error } = await supabase.from('vitrine_agendamentos').insert({
      user_id: config.user_id,
      nome_cliente: formCliente.nome,
      telefone_cliente: formCliente.telefone,
      email_cliente: formCliente.email,
      placa: formCliente.placa,
      veiculo: formCliente.veiculo,
      servico_id: servicoSelecionado.id,
      servico_nome: servicoSelecionado.nome,
      data_hora: dataHora.toISOString(),
      data_hora_fim: dataHoraFim.toISOString(),
      duracao_min: 60,
      valor: preco,
      status: 'pendente',
      observacoes: formCliente.observacoes,
    })

    setEnviando(false)
    if (error) {
      alert('Erro ao agendar. Tente novamente.')
      return
    }
    setEtapa('confirmado')
  }

  // =====================================================================
  // Loading / Error
  // =====================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando vitrine...</p>
        </div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-700">Vitrine não encontrada</p>
          <p className="text-sm text-gray-400 mt-1">O link pode estar incorreto ou a vitrine foi desativada</p>
        </div>
      </div>
    )
  }

  // Paleta fixa A.T.A Gestão — sem customização por tenant.
  const corPri = '#CFFF04'
  const corSec = '#1a1a2e'

  // =====================================================================
  // Etapa: Confirmado
  // =====================================================================

  if (etapa === 'confirmado') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: corPri + '30' }}>
            <CheckCircle2 size={32} style={{ color: corSec }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Agendamento solicitado!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Seu agendamento está <strong>pendente de confirmação</strong>. A empresa entrará em contato.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <p className="text-xs text-gray-500"><strong>Serviço:</strong> {servicoSelecionado?.nome}</p>
            <p className="text-xs text-gray-500"><strong>Data:</strong> {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs text-gray-500"><strong>Horário:</strong> {horaSelecionada}</p>
            <p className="text-xs text-gray-500"><strong>Nome:</strong> {formCliente.nome}</p>
          </div>
          <button
            onClick={() => { setEtapa('catalogo'); setServicoSelecionado(null); setHoraSelecionada(''); setFormCliente({ nome: '', telefone: '', email: '', placa: '', veiculo: '', observacoes: '' }) }}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: corSec }}
          >
            Voltar ao catálogo
          </button>
        </div>
      </div>
    )
  }

  // =====================================================================
  // Render principal
  // =====================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-40 sm:h-52" style={{ backgroundColor: corSec }}>
        {config.banner_url && (
          <img src={config.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Perfil card */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            {config.logo_url ? (
              <img src={config.logo_url} alt="" className="w-20 h-20 rounded-2xl object-contain border-4 border-white shadow-md bg-white shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center border-4 border-white shadow-md shrink-0" style={{ backgroundColor: corPri }}>
                <Store size={32} style={{ color: corSec }} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900">{config.nome_empresa}</h1>
              {config.slogan && <p className="text-sm text-gray-500">{config.slogan}</p>}
              {config.descricao && <p className="text-xs text-gray-400 mt-2 line-clamp-3">{config.descricao}</p>}
            </div>
          </div>

          {/* Contato */}
          <div className="flex flex-wrap gap-2 mt-4">
            {config.whatsapp && (
              <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold hover:bg-green-200 transition-colors">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {config.telefone && (
              <a href={`tel:${config.telefone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors">
                <Phone size={14} /> {config.telefone}
              </a>
            )}
            {config.email && (
              <a href={`mailto:${config.email}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-200 transition-colors">
                <Mail size={14} /> E-mail
              </a>
            )}
            {config.endereco && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                <MapPin size={14} /> {config.endereco}{config.cidade ? `, ${config.cidade}` : ''}{config.estado ? ` - ${config.estado}` : ''}
              </span>
            )}
          </div>

          {/* Redes */}
          <div className="flex gap-2 mt-3">
            {config.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center hover:bg-pink-200 transition-colors">
                <Instagram size={16} />
              </a>
            )}
            {config.facebook_url && (
              <a href={config.facebook_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            )}
          </div>
        </div>

        {/* Etapa: Catálogo */}
        {etapa === 'catalogo' && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Star size={18} style={{ color: corPri }} /> Nossos serviços
            </h2>
            {servicos.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-sm text-gray-500">Nenhum serviço disponível no momento</p>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {servicos.map(s => {
                  const preco = s.preco_vitrine ?? s.preco_padrao
                  return (
                    <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex">
                        {s.foto_url && (
                          <img src={s.foto_url} alt="" className="w-24 sm:w-32 h-24 sm:h-32 object-cover shrink-0" />
                        )}
                        <div className="flex-1 p-4 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{s.nome}</h3>
                            {s.descricao && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{s.descricao}</p>}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-base font-bold" style={{ color: corSec }}>
                              {preco > 0 ? fmt(preco) : 'Consultar'}
                            </p>
                            {config.aceita_agendamento && (
                              <button
                                onClick={() => { setServicoSelecionado(s); setEtapa('agendar'); setHoraSelecionada('') }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                                style={{ backgroundColor: corSec }}
                              >
                                <Calendar size={12} /> Agendar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Etapa: Agendar */}
        {etapa === 'agendar' && servicoSelecionado && (
          <div className="space-y-4 mb-8">
            <button onClick={() => setEtapa('catalogo')} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700">
              <ChevronLeft size={14} /> Voltar ao catálogo
            </button>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Agendando: {servicoSelecionado.nome}</h3>
              <p className="text-xs text-gray-400">
                {(servicoSelecionado.preco_vitrine ?? servicoSelecionado.preco_padrao) > 0
                  ? fmt(servicoSelecionado.preco_vitrine ?? servicoSelecionado.preco_padrao)
                  : 'Valor a consultar'}
              </p>
            </div>

            {/* Seleção de dia */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Calendar size={14} /> Escolha o dia</h3>
                <div className="flex gap-1">
                  <button onClick={() => setSemanaOffset(Math.max(0, semanaOffset - 1))} disabled={semanaOffset === 0} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setSemanaOffset(semanaOffset + 1)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {diasVisiveis.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum dia disponível nesta semana</p>
                ) : (
                  diasVisiveis.map(d => {
                    const sel = isSameDay(d, diaSelecionado)
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => { setDiaSelecionado(d); setHoraSelecionada('') }}
                        className={`flex flex-col items-center px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all shrink-0 ${sel ? 'text-white' : 'border-gray-100 text-gray-700 hover:border-gray-200'}`}
                        style={sel ? { backgroundColor: corSec, borderColor: corSec } : {}}
                      >
                        <span className="text-[10px] uppercase opacity-70">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                        <span className="text-lg">{d.getDate()}</span>
                        <span className="text-[10px] opacity-70">{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Horários */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5"><Clock size={14} /> Horários disponíveis</h3>
              {slotsDisponiveis.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum horário disponível neste dia</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slotsDisponiveis.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setHoraSelecionada(slot)}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${horaSelecionada === slot ? 'text-white' : 'border-gray-100 text-gray-700 hover:border-gray-200'}`}
                      style={horaSelecionada === slot ? { backgroundColor: corSec, borderColor: corSec } : {}}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dados do cliente */}
            {horaSelecionada && (
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Seus dados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                    <input type="text" value={formCliente.nome} onChange={e => setFormCliente({ ...formCliente, nome: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 outline-none" style={{ '--tw-ring-color': corPri } as any} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone *</label>
                    <input type="tel" value={formCliente.telefone} onChange={e => setFormCliente({ ...formCliente, telefone: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Placa do veículo</label>
                    <input type="text" value={formCliente.placa} onChange={e => setFormCliente({ ...formCliente, placa: e.target.value.toUpperCase() })} placeholder="ABC-1234" maxLength={8} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Veículo</label>
                    <input type="text" value={formCliente.veiculo} onChange={e => setFormCliente({ ...formCliente, veiculo: e.target.value })} placeholder="Ex: Honda Civic Preto" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                  <textarea value={formCliente.observacoes} onChange={e => setFormCliente({ ...formCliente, observacoes: e.target.value })} rows={2} placeholder="Alguma informação adicional..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 outline-none resize-none" />
                </div>
                <button
                  onClick={handleAgendar}
                  disabled={enviando || !formCliente.nome || !formCliente.telefone}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: corSec }}
                >
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {enviando ? 'Enviando...' : 'Confirmar agendamento'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-[10px] text-gray-400">Powered by <strong>A.T.A</strong> — Assistente Técnico Automotivo</p>
        </div>
      </div>
    </div>
  )
}
