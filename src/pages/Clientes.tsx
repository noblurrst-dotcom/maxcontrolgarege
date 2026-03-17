import { useState } from 'react'
import { Users, Plus, Search, Car, Trash2, X, MessageCircle, Cake, MapPin } from 'lucide-react'
import type { Cliente } from '../types'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

const initForm = () => ({ nome: '', telefone: '', email: '', cpf_cnpj: '', veiculo: '', placa: '', endereco: '', aniversario: '', observacoes: '' })

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>(() => { try { return JSON.parse(localStorage.getItem('clientes') || '[]') } catch { return [] } })
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [detalhe, setDetalhe] = useState<Cliente | null>(null)
  const [form, setForm] = useState(initForm())

  const salvar = (l: Cliente[]) => { setLista(l); localStorage.setItem('clientes', JSON.stringify(l)) }

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
    const tel = c.telefone?.replace(/\D/g, '')
    window.open(`https://wa.me/${tel ? '55' + tel : ''}`, '_blank')
  }

  const filtradas = lista.filter((c) => {
    const t = busca.toLowerCase()
    return c.nome.toLowerCase().includes(t) || c.placa.toLowerCase().includes(t) || c.telefone.includes(t) || (c.cpf_cnpj || '').includes(t)
  })

  const aniversariantes = lista.filter(c => {
    if (!c.aniversario) return false
    const [, m, d] = c.aniversario.split('-')
    const now = new Date()
    return parseInt(m) === now.getMonth() + 1 && parseInt(d) === now.getDate()
  })

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{lista.length} cliente{lista.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm">
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, placa, telefone ou CPF/CNPJ..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total', value: lista.length, Icon: Users, color: 'text-primary-600', iconBg: 'bg-primary-100' },
          { label: 'Com veículo', value: lista.filter((c) => c.placa).length, Icon: Car, color: 'text-violet-600', iconBg: 'bg-violet-100' },
          { label: 'Este mês', value: lista.filter((c) => { const d = new Date(c.created_at); return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear() }).length, Icon: Users, color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
          { label: 'Aniversário hoje', value: aniversariantes.length, Icon: Cake, color: 'text-rose-500', iconBg: 'bg-rose-100' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 ${item.iconBg} rounded-xl flex items-center justify-center`}><item.Icon size={16} className={item.color} /></div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-400">{item.label}</p>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {aniversariantes.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
          <p className="text-xs font-bold text-rose-600 mb-2"><Cake size={14} className="inline mr-1" />Aniversariantes de hoje</p>
          <div className="flex flex-wrap gap-2">
            {aniversariantes.map(c => (
              <span key={c.id} className="text-xs bg-white text-rose-600 font-semibold px-3 py-1 rounded-full border border-rose-200">{c.nome}</span>
            ))}
          </div>
        </div>
      )}

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">{busca ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}</p>
          <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Cadastre seu primeiro cliente'}</p>
        </div>
      ) : (
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
                {c.telefone && <button onClick={(e) => { e.stopPropagation(); enviarWhatsApp(c) }} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>}
                <button onClick={(e) => { e.stopPropagation(); remover(c.id) }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                {detalhe.total_gasto > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5">Total gasto</p>
                    <p className="text-xs font-bold text-emerald-600">{fmt(detalhe.total_gasto)}</p>
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

              {detalhe.observacoes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Observações</p>
                  <p className="text-xs text-gray-700">{detalhe.observacoes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {detalhe.telefone && (
                  <button onClick={() => enviarWhatsApp(detalhe)} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                )}
                <button onClick={() => remover(detalhe.id)} className="flex-1 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors">
                  Excluir Cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
