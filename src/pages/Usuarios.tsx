import { useState } from 'react'
import { Search, X, UserPlus, Shield, Trash2, Pencil, Eye, EyeOff, Check, ChevronDown, UserCircle } from 'lucide-react'
import { useSubUsuario, getDefaultPermissoes } from '../contexts/SubUsuarioContext'
import type { SubUsuario, ModuloId } from '../types'
import { MODULOS_DISPONIVEIS, ROLES_LABELS } from '../types'
import { uid } from '../lib/utils'

const ROLE_COLORS: Record<SubUsuario['role'], { bg: string; text: string }> = {
  admin: { bg: 'bg-red-100', text: 'text-red-700' },
  gerente: { bg: 'bg-blue-100', text: 'text-blue-700' },
  operador: { bg: 'bg-amber-100', text: 'text-amber-700' },
  visualizador: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

const initForm = (): Omit<SubUsuario, 'id' | 'owner_id' | 'created_at' | 'updated_at'> => ({
  nome: '',
  email: '',
  senha: '',
  cargo: '',
  ativo: true,
  role: 'operador',
  permissoes: getDefaultPermissoes('operador'),
})

export default function Usuarios() {
  const { subUsuarios, salvarSubUsuarios, isOwner, subUsuarioAtivo } = useSubUsuario()
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(initForm())
  const [showSenha, setShowSenha] = useState(false)
  const [permissoesAberto, setPermissoesAberto] = useState(false)

  const filtrados = subUsuarios.filter(u => {
    const termo = busca.toLowerCase()
    return u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo) || u.cargo.toLowerCase().includes(termo)
  })

  const abrirNovo = () => {
    setEditId(null)
    setForm(initForm())
    setShowSenha(false)
    setPermissoesAberto(false)
    setModal(true)
  }

  const abrirEditar = (u: SubUsuario) => {
    setEditId(u.id)
    setForm({
      nome: u.nome,
      email: u.email,
      senha: u.senha,
      cargo: u.cargo,
      ativo: u.ativo,
      role: u.role,
      permissoes: u.permissoes,
    })
    setShowSenha(false)
    setPermissoesAberto(false)
    setModal(true)
  }

  const salvar = () => {
    if (!form.nome.trim() || !form.email.trim()) return

    if (editId) {
      salvarSubUsuarios(subUsuarios.map(u => u.id === editId ? {
        ...u,
        ...form,
        updated_at: new Date().toISOString(),
      } : u))
    } else {
      if (!form.senha.trim()) return
      salvarSubUsuarios([...subUsuarios, {
        ...form,
        id: uid(),
        owner_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
    }
    setModal(false)
  }

  const remover = (id: string) => {
    salvarSubUsuarios(subUsuarios.filter(u => u.id !== id))
  }

  const toggleAtivo = (id: string) => {
    salvarSubUsuarios(subUsuarios.map(u => u.id === id ? { ...u, ativo: !u.ativo, updated_at: new Date().toISOString() } : u))
  }

  const handleRoleChange = (role: SubUsuario['role']) => {
    setForm({ ...form, role, permissoes: getDefaultPermissoes(role) })
  }

  const togglePerm = (modulo: ModuloId, campo: 'ver' | 'editar') => {
    const perms = form.permissoes.map(p => {
      if (p.modulo !== modulo) return p
      if (campo === 'ver' && p.ver) return { ...p, ver: false, editar: false }
      if (campo === 'editar') return { ...p, editar: !p.editar, ver: true }
      return { ...p, [campo]: !p[campo] }
    })
    setForm({ ...form, permissoes: perms })
  }

  if (!isOwner) {
    return (
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Shield size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">Acesso restrito</p>
          <p className="text-gray-400 text-sm mt-1">Somente o proprietário pode gerenciar usuários.</p>
          {subUsuarioAtivo && (
            <p className="text-xs text-gray-400 mt-3">Logado como: <strong>{subUsuarioAtivo.nome}</strong> ({ROLES_LABELS[subUsuarioAtivo.role]})</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gerencie o acesso e permissões da equipe</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm">
          <UserPlus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: subUsuarios.length, color: 'text-violet-600', bg: 'bg-violet-100' },
          { label: 'Ativos', value: subUsuarios.filter(u => u.ativo).length, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Inativos', value: subUsuarios.filter(u => !u.ativo).length, color: 'text-gray-500', bg: 'bg-gray-100' },
          { label: 'Admins', value: subUsuarios.filter(u => u.role === 'admin').length, color: 'text-red-600', bg: 'bg-red-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-[10px] font-medium text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, email ou cargo..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <UserCircle size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">{busca ? 'Nenhum resultado' : 'Nenhum usuário'}</p>
          <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Adicione membros da equipe'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(u => {
            const rc = ROLE_COLORS[u.role]
            const permVer = u.permissoes.filter(p => p.ver).length
            const permEdit = u.permissoes.filter(p => p.editar).length
            return (
              <div key={u.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${!u.ativo ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${rc.bg} ${rc.text}`}>
                      {u.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate">{u.nome}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>{ROLES_LABELS[u.role]}</span>
                        {!u.ativo && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inativo</span>}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {u.email}{u.cargo ? ` · ${u.cargo}` : ''} · {permVer} módulos visíveis · {permEdit} editáveis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button onClick={() => toggleAtivo(u.id)} className={`p-1.5 rounded-lg transition-colors ${u.ativo ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-50'}`} title={u.ativo ? 'Desativar' : 'Ativar'}>
                      {u.ativo ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => abrirEditar(u)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remover(u.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nome *</label>
                <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do usuário" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              {/* Senha */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Senha {editId ? '(deixe vazio para manter)' : '*'}</label>
                <div className="relative">
                  <input type={showSenha ? 'text' : 'password'} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} placeholder="••••••" className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Cargo */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Cargo</label>
                <input type="text" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Atendente, Polidor..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nível de acesso</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['admin', 'gerente', 'operador', 'visualizador'] as SubUsuario['role'][]).map(r => {
                    const rc = ROLE_COLORS[r]
                    const selected = form.role === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                          selected ? `${rc.bg} ${rc.text} border-current` : 'border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        {selected && <Check size={14} />}
                        <Shield size={14} />
                        {ROLES_LABELS[r]}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {form.role === 'admin' && 'Acesso total a todos os módulos.'}
                  {form.role === 'gerente' && 'Acesso a tudo, exceto configurações e usuários.'}
                  {form.role === 'operador' && 'Acesso operacional: vendas, agenda, clientes, checklists.'}
                  {form.role === 'visualizador' && 'Somente visualização: painel, vendas, agenda, clientes.'}
                </p>
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-semibold text-gray-600">Usuário ativo</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, ativo: !form.ativo })}
                  className={`w-10 h-[22px] rounded-full flex items-center px-0.5 transition-colors ${form.ativo ? 'bg-emerald-500 justify-end' : 'bg-gray-200 justify-start'}`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              {/* Permissões detalhadas */}
              <div>
                <button type="button" onClick={() => setPermissoesAberto(!permissoesAberto)} className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-primary-600 transition-colors">
                  <ChevronDown size={14} className={`transition-transform ${permissoesAberto ? 'rotate-180' : ''}`} />
                  Permissões detalhadas por módulo
                </button>

                {permissoesAberto && (
                  <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_60px_60px] gap-0 bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>Módulo</span>
                      <span className="text-center">Ver</span>
                      <span className="text-center">Editar</span>
                    </div>
                    {MODULOS_DISPONIVEIS.map(mod => {
                      const perm = form.permissoes.find(p => p.modulo === mod.id) || { ver: false, editar: false }
                      return (
                        <div key={mod.id} className="grid grid-cols-[1fr_60px_60px] gap-0 px-3 py-2.5 border-t border-gray-50 items-center">
                          <span className="text-xs font-medium text-gray-700">{mod.label}</span>
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => togglePerm(mod.id, 'ver')}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${perm.ver ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-300'}`}
                            >
                              <Check size={12} />
                            </button>
                          </div>
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => togglePerm(mod.id, 'editar')}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${perm.editar ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'}`}
                            >
                              <Pencil size={10} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={!form.nome.trim() || !form.email.trim() || (!editId && !form.senha.trim())} className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {editId ? 'Salvar' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
