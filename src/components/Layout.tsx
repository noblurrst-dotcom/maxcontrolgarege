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
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect } from 'react'
import { useBrand } from '../contexts/BrandContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { brand } = useBrand()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
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

  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'

  const navItems = [
    { path: '/', label: 'Painel', icon: LayoutDashboard },
    { path: '/vendas', label: 'Vendas', icon: ShoppingCart },
    { path: '/agenda', label: 'Agenda', icon: CalendarDays },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/checklists', label: 'Checklists', icon: ClipboardCheck },
    { path: '/financeiro', label: 'Financeiro', icon: DollarSign },
    { path: '/servicos', label: 'Serviços', icon: Briefcase },
  ]

  const bottomNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Painel' },
    { path: '/vendas', icon: ShoppingCart, label: 'Vendas' },
    { path: '/agenda', icon: CalendarDays, label: 'Agenda' },
    { path: '/clientes', icon: Users, label: 'Clientes' },
  ]

  const moreItems = [
    { path: '/financeiro', icon: DollarSign, label: 'Financeiro' },
    { path: '/checklists', icon: ClipboardCheck, label: 'Checklists' },
    { path: '/servicos', icon: Briefcase, label: 'Serviços' },
  ]

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
                      <p className="text-sm font-bold text-gray-900 truncate">{nomeUsuario}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                    </div>

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

      {/* Main Content */}
      <main className="flex-1 container-responsive container-with-bottom-nav py-4 sm:py-6">
        <Outlet />
      </main>

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
