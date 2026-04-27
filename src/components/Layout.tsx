import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Car,
  LayoutDashboard,
  ShoppingCart,
  CalendarDays,
  Users,
  LogOut,
  Menu,
  X,
  DollarSign,
  Briefcase,
  BarChart2,
  MoreHorizontal,
  Settings,
  Moon,
  Sun,
  UserCircle,
  UsersRound,
  Shield,
  HelpCircle,
  Copy,
  Loader2,
  Check,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useBrand } from '../contexts/BrandContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSubUsuario } from '../contexts/SubUsuarioContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import FloatingHelpButton from './FloatingHelpButton'
import GlobalBanner from './GlobalBanner'
import MensagensDropdown from './MensagensDropdown'
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin'
import { useSupportView } from '../contexts/SupportViewContext'
import type { ModuloId } from '../types'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { brand } = useBrand()
  const { isDark, toggleTheme } = useTheme()
  const { subUsuarioAtivo, podeVer, logoutSubUsuario } = useSubUsuario()
  const { isSupport, supportInfo, endSupportView } = useSupportView()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [supportModal, setSupportModal] = useState(false)
  const [supportCode, setSupportCode] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sessão encerrada')
    navigate('/login')
  }

  const nomeUsuario = brand.nome_usuario || user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'
  const { isSuperAdmin } = useIsSuperAdmin()

  const generateSupportCode = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      toast.error('Não foi possível gerar o código')
      return
    }
    setSupportLoading(true)
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { error } = await supabase.from('support_codes').insert({
        user_id: user.id,
        code,
        user_email: user.email || '',
        user_nome: nomeUsuario,
      })
      if (error) throw error
      setSupportCode(code)
      setSupportModal(true)
    } catch (err: any) {
      console.error('Erro ao gerar código de suporte:', err)
      toast.error('Erro ao gerar código')
    } finally {
      setSupportLoading(false)
    }
  }, [user, nomeUsuario])

  const copySupportCode = () => {
    navigator.clipboard.writeText(supportCode)
    setCopied(true)
    toast.success('Código copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const allNavItems = [
    { path: '/', label: 'Painel', icon: LayoutDashboard, modulo: 'dashboard' as ModuloId },
    { path: '/vendas', label: 'Vendas', icon: ShoppingCart, modulo: 'vendas' as ModuloId },
    { path: '/agenda', label: 'Agenda', icon: CalendarDays, modulo: 'agenda' as ModuloId },
    { path: '/clientes', label: 'Clientes', icon: Users, modulo: 'clientes' as ModuloId },
    { path: '/financeiro', label: 'Financeiro', icon: DollarSign, modulo: 'financeiro' as ModuloId },
    { path: '/servicos', label: 'Serviços', icon: Briefcase, modulo: 'servicos' as ModuloId },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart2, modulo: 'financeiro' as ModuloId },
  ]
  const navItems = allNavItems.filter(i => podeVer(i.modulo))

  const todasTelas = allNavItems.map(i => ({ label: i.label, path: i.path, icon: i.icon, modulo: i.modulo }))
  const resultadosBusca = busca.trim().length > 0
    ? todasTelas.filter(t => podeVer(t.modulo) && t.label.toLowerCase().includes(busca.toLowerCase()))
    : []

  const bottomNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Painel', modulo: 'dashboard' as ModuloId },
    { path: '/vendas', icon: ShoppingCart, label: 'Vendas', modulo: 'vendas' as ModuloId },
    { path: '/agenda', icon: CalendarDays, label: 'Agenda', modulo: 'agenda' as ModuloId },
    { path: '/clientes', icon: Users, label: 'Clientes', modulo: 'clientes' as ModuloId },
  ].filter(i => podeVer(i.modulo))

  const moreItems = [
    { path: '/financeiro', icon: DollarSign, label: 'Financeiro', modulo: 'financeiro' as ModuloId },
    { path: '/servicos', icon: Briefcase, label: 'Serviços', modulo: 'servicos' as ModuloId },
    { path: '/relatorios', icon: BarChart2, label: 'Relatórios', modulo: 'financeiro' as ModuloId },
  ].filter(i => podeVer(i.modulo))

  const isMoreActive = moreItems.some(i => location.pathname === i.path)

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <header className="sticky top-0 z-40 shadow-md safe-area-top bg-secondary-500 w-full max-w-full">

        {/* LINHA 1 — Logo + Busca + Perfil */}
        <div className="container-responsive">
          <div className="h-14 sm:h-16 md:h-20 flex items-center gap-2 sm:gap-3 min-w-0">

            {/* Logo A.T.A + Divisor + Logo Cliente */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Logo A.T.A Gestão (plataforma) — adaptativo claro/escuro */}
              <div className="flex items-center cursor-pointer" onClick={() => navigate('/')} title="A.T.A Gestão">
                <img
                  src={isDark ? '/kv/logo-horizontal-white.png' : '/kv/logo-horizontal-blue.png'}
                  alt="A.T.A Gestão"
                  className="h-[38px] w-auto hidden md:block"
                />
                <img
                  src={isDark ? '/kv/logo-horizontal-white.png' : '/kv/logo-horizontal-blue.png'}
                  alt="A.T.A Gestão"
                  className="h-7 w-auto md:hidden"
                />
              </div>

              {/* Divisor */}
              <div className="w-px h-8 sm:h-10 md:h-14 bg-white/25" aria-hidden="true" />

              {/* Logo + nome do cliente */}
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} title={brand.nome_empresa || 'Minha empresa'}>
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={`Logo ${brand.nome_empresa || 'da empresa'}`} className="w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-lg md:rounded-xl object-contain" />
                ) : (
                  <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center bg-primary-500">
                    <Car className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-on-primary" />
                  </div>
                )}
                <span className="text-sm md:text-base font-semibold text-on-secondary tracking-tight hidden md:block max-w-[200px] truncate">
                  {brand.nome_empresa || 'Minha empresa'}
                </span>
              </div>
            </div>

            {/* Busca global — centro (hidden on mobile, icon opens overlay) */}
            <div className="flex-1 min-w-0 max-w-md mx-auto relative hidden sm:block">
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2.5 transition-colors cursor-text"
                onClick={() => { setBuscaAberta(true); buscaRef.current?.focus() }}>
                <Search size={16} className="text-white/50 shrink-0" />
                <input
                  ref={buscaRef}
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onFocus={() => setBuscaAberta(true)}
                  onBlur={() => setTimeout(() => { setBuscaAberta(false); setBusca('') }, 150)}
                  placeholder="Buscar tela ou função..."
                  className="flex-1 bg-transparent text-on-secondary placeholder-white/40 text-sm md:text-base outline-none min-w-0"
                />
              </div>

              {/* Dropdown de resultados */}
              {buscaAberta && resultadosBusca.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  {resultadosBusca.map(t => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.path}
                        onMouseDown={() => { navigate(t.path); setBusca(''); setBuscaAberta(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Icon size={16} className="text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Mobile: spacer to push actions right */}
            <div className="flex-1 sm:hidden" />

            {/* Ações direita */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">

              {/* Mobile search icon */}
              <button
                onClick={() => { setBuscaAberta(true); setTimeout(() => buscaRef.current?.focus(), 100) }}
                className="sm:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Buscar"
              >
                <Search size={20} />
              </button>

              {/* Mensagens */}
              <MensagensDropdown />

              {/* Toggle dark mode */}
              <button onClick={toggleTheme}
                className="p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors hidden md:flex"
                title={isDark ? 'Modo claro' : 'Modo noturno'}>
                {isDark ? <Sun size={22} /> : <Moon size={22} />}
              </button>

              {/* Perfil dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
                  title={nomeUsuario}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 bg-primary-500">
                    <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-on-primary" />
                  </div>
                  <span className="text-sm md:text-base font-medium text-on-secondary hidden md:block max-w-[120px] truncate">
                    {subUsuarioAtivo ? subUsuarioAtivo.nome : nomeUsuario}
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Nome do usuário */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{subUsuarioAtivo ? subUsuarioAtivo.nome : nomeUsuario}</p>
                      <p className="text-[11px] text-gray-400 truncate">{subUsuarioAtivo ? subUsuarioAtivo.email : user?.email}</p>
                      {subUsuarioAtivo && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Shield size={10} className="text-primary-600" />
                          <span className="text-[10px] font-bold text-primary-600">{subUsuarioAtivo.cargo || subUsuarioAtivo.role}</span>
                        </div>
                      )}
                    </div>
                    {subUsuarioAtivo && (
                      <button
                        onClick={() => { logoutSubUsuario(); setProfileOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-warning-600 hover:bg-warning-50 transition-colors"
                      >
                        <UsersRound size={16} />
                        Voltar ao proprietário
                      </button>
                    )}

                    {/* Usuários */}
                    {podeVer('usuarios') && (
                      <button
                        onClick={() => { navigate('/usuarios'); setProfileOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UsersRound size={16} className="text-gray-400" />
                        Usuários
                      </button>
                    )}

                    {/* Configurações */}
                    <button
                      onClick={() => { navigate('/configuracoes'); setProfileOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={16} className="text-gray-400" />
                      Configurações
                    </button>

                    {/* Modo noturno */}
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        {isDark ? <Sun size={16} className="text-warning-400" /> : <Moon size={16} className="text-gray-400" />}
                        {isDark ? 'Modo claro' : 'Modo noturno'}
                      </span>
                      <span className={`w-8 h-[18px] rounded-full flex items-center px-0.5 transition-colors ${
                        isDark ? 'bg-primary-500 justify-end' : 'bg-gray-200 justify-start'
                      }`}>
                        <span className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                      </span>
                    </button>

                    {/* Super Admin — campo de código inline */}
                    {isSuperAdmin && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-2">
                          <p className="text-[10px] font-bold text-warning-600 uppercase mb-1.5 flex items-center gap-1"><Shield size={10} /> Suporte Admin</p>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={adminCode}
                              onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && adminCode.trim().length >= 6) {
                                  setProfileOpen(false)
                                  navigate(`/admin/suporte?code=${adminCode.trim()}`)
                                  setAdminCode('')
                                }
                              }}
                              placeholder="Código"
                              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold text-center uppercase tracking-wider focus:ring-1 focus:ring-gray-900 outline-none"
                              maxLength={8}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (adminCode.trim().length >= 6) {
                                  setProfileOpen(false)
                                  navigate(`/admin/suporte?code=${adminCode.trim()}`)
                                  setAdminCode('')
                                }
                              }}
                              disabled={adminCode.trim().length < 6}
                              className="px-2.5 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-bold disabled:opacity-30 hover:bg-gray-800 transition-colors"
                            >
                              Acessar
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Ajuda / Suporte */}
                    {!isSuperAdmin && (
                      <button
                        onClick={() => { setProfileOpen(false); generateSupportCode() }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {supportLoading ? <Loader2 size={16} className="text-gray-400 animate-spin" /> : <HelpCircle size={16} className="text-gray-400" />}
                        Solicitar Ajuda
                      </button>
                    )}

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-1" />

                    {/* Sair */}
                    <button
                      onClick={() => { setProfileOpen(false); handleSignOut() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-500 hover:bg-danger-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>

              {/* Menu hamburguer mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white/60 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* LINHA 2 — Navegação horizontal com ícone + label (apenas desktop) */}
        <div className="hidden md:block border-t border-white/10 bg-secondary-500">
          <div className="container-responsive">
            <div className="flex items-center gap-0.5 h-11">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`relative flex items-center gap-2 px-3.5 h-full text-sm font-semibold transition-colors rounded-t-lg ${
                      isActive ? 'text-primary-500' : 'text-on-secondary opacity-60 hover:opacity-90'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-500" />
                    )}
                  </button>
                )
              })}
              {isSuperAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className={`relative flex items-center gap-2 px-3.5 h-full text-sm font-semibold transition-colors rounded-t-lg ml-auto ${
                    location.pathname.startsWith('/admin') ? 'text-warning-400' : 'text-warning-400/50 hover:text-warning-400/80'
                  }`}
                >
                  <Shield size={18} />
                  <span>Superadmin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search overlay */}
        {buscaAberta && (
          <div className="sm:hidden border-t border-white/10 px-3 py-3 bg-secondary-500">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
              <Search size={16} className="text-white/50 shrink-0" />
              <input
                ref={buscaRef}
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onBlur={() => setTimeout(() => { setBuscaAberta(false); setBusca('') }, 150)}
                placeholder="Buscar tela ou função..."
                className="flex-1 bg-transparent text-on-secondary placeholder-white/40 text-sm outline-none min-w-0"
                autoFocus
              />
              <button onClick={() => { setBuscaAberta(false); setBusca('') }} className="p-1 text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>
            {resultadosBusca.length > 0 && (
              <div className="mt-2 bg-white rounded-xl shadow-xl py-1">
                {resultadosBusca.map(t => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.path}
                      onMouseDown={() => { navigate(t.path); setBusca(''); setBuscaAberta(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                    >
                      <Icon size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-700">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 px-3 py-2 max-h-[70vh] overflow-y-auto bg-secondary-500">
            <div className="grid grid-cols-3 gap-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMobileMenuOpen(false)
                    }}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? ''
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-primary-500' : ''} />
                    <span className={`truncate w-full text-center ${isActive ? 'text-primary-500' : ''}`}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Support Mode Banner */}
      {isSupport && (
        <div className="sticky top-14 sm:top-16 md:top-[124px] z-30 flex items-center justify-between gap-3 px-4 py-2 bg-warning-400 text-warning-900">
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={14} className="shrink-0" />
            <p className="text-xs font-bold truncate">
              Modo Suporte — Visualizando: <span className="font-extrabold">{supportInfo?.nome || supportInfo?.email || 'Usuário'}</span>
            </p>
          </div>
          <button
            onClick={() => { endSupportView(); navigate('/admin/suporte') }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-warning-900/20 hover:bg-warning-900/30 rounded-lg text-[11px] font-bold transition-colors"
          >
            <LogOut size={12} />
            Encerrar
          </button>
        </div>
      )}

      {/* Support Code Modal */}
      {supportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary-500/15">
                <HelpCircle size={28} className="text-primary-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Código de Suporte</h3>
              <p className="text-xs text-gray-500 mt-1">Envie este código para nossa equipe de suporte para que possamos acessar sua conta e ajudá-lo.</p>
            </div>

            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <span className="flex-1 text-center text-2xl font-mono font-bold tracking-[0.3em] text-gray-900">{supportCode}</span>
                <button
                  onClick={copySupportCode}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Copiar"
                >
                  {copied ? <Check size={18} className="text-success-500" /> : <Copy size={18} className="text-gray-400" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">Válido por 30 minutos</p>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => { setSupportModal(false); setSupportCode('') }}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors bg-primary-500 hover:bg-primary-hover text-on-primary"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner global */}
      <GlobalBanner />

      {/* Main Content */}
      <main className="flex-1 container-responsive container-with-bottom-nav py-4 sm:py-6">
        <Outlet />
      </main>

      {/* Floating Help Button — hidden in support mode */}
      {!isSupport && <FloatingHelpButton />}

      {/* Bottom Navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-bottom">
        <div className="flex justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileMoreOpen(false) }}
                className={`btn-mobile flex flex-col items-center gap-0.5 min-w-[3rem] py-1 transition-colors ${
                  isActive
                    ? ''
                    : 'text-gray-400'
                }`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary-500' : ''} />
                <span className={`mobile-text-xs ${isActive ? 'font-bold text-primary-500' : 'font-medium'}`}>{item.label}</span>
              </button>
            )
          })}
          {/* More button */}
          <button
            onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
            className={`btn-mobile flex flex-col items-center gap-0.5 min-w-[3rem] py-1 transition-colors ${
              isMoreActive || mobileMoreOpen ? '' : 'text-gray-400'
            }`}
          >
            <MoreHorizontal size={22} strokeWidth={isMoreActive || mobileMoreOpen ? 2.5 : 2} className={isMoreActive || mobileMoreOpen ? 'text-primary-500' : ''} />
            <span className={`mobile-text-xs ${isMoreActive || mobileMoreOpen ? 'font-bold text-primary-500' : 'font-medium'}`}>Mais</span>
          </button>
        </div>

        {/* More panel */}
        {mobileMoreOpen && (
          <>
            <div className="fixed inset-0 bg-black/20 z-[-1]" onClick={() => setMobileMoreOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg rounded-t-2xl p-3 animate-in slide-in-from-bottom">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <div className="grid grid-cols-3 gap-2">
                {moreItems.map((item) => {
                  const isActive = location.pathname === item.path
                  const Icon = item.icon
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setMobileMoreOpen(false) }}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors active:scale-95 ${
                        isActive
                          ? ''
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={22} className={isActive ? 'text-primary-500' : ''} />
                      <span className={`text-[11px] ${isActive ? 'font-bold text-primary-500' : 'font-medium'}`}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  )
}
