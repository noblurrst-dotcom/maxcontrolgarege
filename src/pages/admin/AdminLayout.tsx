import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  BarChart2,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Headphones,
  Megaphone,
} from 'lucide-react'
import { useState } from 'react'
import toast from '../../lib/toast'

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: BarChart2 },
  { path: '/admin/contas', label: 'Contas', icon: Users },
  { path: '/admin/comunicacao', label: 'Comunicação', icon: Megaphone },
  { path: '/admin/suporte', label: 'Suporte', icon: Headphones, external: true },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sessão encerrada')
    navigate('/login')
  }

  const handleNav = (path: string, external?: boolean) => {
    setSidebarOpen(false)
    if (external) {
      // Abrir em nova aba para não perder contexto do admin
      window.open(path, '_blank')
    } else {
      navigate(path)
    }
  }

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  const email = user?.email || ''

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-gray-950 text-white flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:z-auto`}>
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 bg-warning-500 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-gray-950" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">Superadmin</p>
            <p className="text-[10px] text-gray-400 truncate">{email}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path, item.external)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-warning-500/15 text-warning-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} />
                {item.label}
                {item.external && <span className="text-[9px] text-gray-500 ml-auto">↗</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={18} />
            Voltar ao app
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-950 text-white">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-warning-500" />
            <span className="text-sm font-bold">Superadmin</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
