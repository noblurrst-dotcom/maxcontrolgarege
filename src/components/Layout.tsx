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
  ClipboardCheck,
  Briefcase,
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
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useBrand } from '../contexts/BrandContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSubUsuario } from '../contexts/SubUsuarioContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import FloatingHelpButton from './FloatingHelpButton'
import type { ModuloId } from '../types'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { brand } = useBrand()
  const { isDark, toggleTheme } = useTheme()
  const { subUsuarioAtivo, podeVer, logoutSubUsuario } = useSubUsuario()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [supportModal, setSupportModal] = useState(false)
  const [supportCode, setSupportCode] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

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
    { path: '/checklists', label: 'Checklists', icon: ClipboardCheck, modulo: 'checklists' as ModuloId },
    { path: '/financeiro', label: 'Financeiro', icon: DollarSign, modulo: 'financeiro' as ModuloId },
    { path: '/servicos', label: 'Serviços', icon: Briefcase, modulo: 'servicos' as ModuloId },
  ]
  const navItems = allNavItems.filter(i => podeVer(i.modulo))

  const bottomNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Painel', modulo: 'dashboard' as ModuloId },
    { path: '/vendas', icon: ShoppingCart, label: 'Vendas', modulo: 'vendas' as ModuloId },
    { path: '/agenda', icon: CalendarDays, label: 'Agenda', modulo: 'agenda' as ModuloId },
    { path: '/clientes', icon: Users, label: 'Clientes', modulo: 'clientes' as ModuloId },
  ].filter(i => podeVer(i.modulo))

  const moreItems = [
    { path: '/financeiro', icon: DollarSign, label: 'Financeiro', modulo: 'financeiro' as ModuloId },
    { path: '/checklists', icon: ClipboardCheck, label: 'Checklists', modulo: 'checklists' as ModuloId },
    { path: '/servicos', icon: Briefcase, label: 'Serviços', modulo: 'servicos' as ModuloId },
  ].filter(i => podeVer(i.modulo))

  const isMoreActive = moreItems.some(i => location.pathname === i.path)

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 shadow-lg safe-area-top" style={{ backgroundColor: brand.cor_secundaria }}>
        <div className="container-responsive">
          <div className="h-14 sm:h-16 flex items-center justify-between">
            {/* Logo */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              {brand.logo_url ? (
                <img src={brand.logo_url} alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain" />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: brand.cor_primaria }}>
                  <Car className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: brand.cor_secundaria }} />
                </div>
              )}
              <span className="text-base sm:text-lg font-bold text-white tracking-tight hidden sm:block">
                {brand.nome_empresa || <>estética<span className="text-primary-400">natã</span></>}
              </span>
            </div>

            {/* Nav - desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? ''
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={isActive ? { color: brand.cor_primaria } : undefined}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: brand.cor_primaria }} />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                  style={{ backgroundColor: brand.cor_primaria }}
                  title={nomeUsuario}
                >
                  <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: brand.cor_secundaria }} />
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
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
                        {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-gray-400" />}
                        {isDark ? 'Modo claro' : 'Modo noturno'}
                      </span>
                      <span className={`w-8 h-[18px] rounded-full flex items-center px-0.5 transition-colors ${
                        isDark ? 'bg-primary-500 justify-end' : 'bg-gray-200 justify-start'
                      }`}>
                        <span className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                      </span>
                    </button>

                    {/* Ajuda / Suporte */}
                    <button
                      onClick={() => { setProfileOpen(false); generateSupportCode() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {supportLoading ? <Loader2 size={16} className="text-gray-400 animate-spin" /> : <HelpCircle size={16} className="text-gray-400" />}
                      Solicitar Ajuda
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-1" />

                    {/* Sair */}
                    <button
                      onClick={() => { setProfileOpen(false); handleSignOut() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 px-3 py-2 max-h-[70vh] overflow-y-auto" style={{ backgroundColor: brand.cor_secundaria }}>
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
                    style={isActive ? { backgroundColor: brand.cor_primaria + '1a', color: brand.cor_primaria } : undefined}
                  >
                    <Icon size={20} />
                    <span className="truncate w-full text-center">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Support Code Modal */}
      {supportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: brand.cor_primaria + '20' }}>
                <HelpCircle size={28} style={{ color: brand.cor_primaria }} />
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
                  {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-gray-400" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">Válido por 30 minutos</p>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => { setSupportModal(false); setSupportCode('') }}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
                style={{ backgroundColor: brand.cor_primaria, color: brand.cor_secundaria }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container-responsive container-with-bottom-nav py-4 sm:py-6">
        <Outlet />
      </main>

      {/* Floating Help Button */}
      <FloatingHelpButton />

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
                style={isActive ? { color: brand.cor_primaria } : undefined}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`mobile-text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </button>
            )
          })}
          {/* More button */}
          <button
            onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
            className={`btn-mobile flex flex-col items-center gap-0.5 min-w-[3rem] py-1 transition-colors ${
              isMoreActive || mobileMoreOpen ? '' : 'text-gray-400'
            }`}
            style={isMoreActive || mobileMoreOpen ? { color: brand.cor_primaria } : undefined}
          >
            <MoreHorizontal size={20} strokeWidth={isMoreActive || mobileMoreOpen ? 2.5 : 2} />
            <span className={`mobile-text-xs ${isMoreActive || mobileMoreOpen ? 'font-bold' : 'font-medium'}`}>Mais</span>
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
                      style={isActive ? { backgroundColor: brand.cor_primaria + '15', color: brand.cor_primaria } : undefined}
                    >
                      <Icon size={22} />
                      <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
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
