import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { BrandProvider } from './contexts/BrandContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SubUsuarioProvider, useSubUsuario } from './contexts/SubUsuarioContext'
import { SupportViewProvider } from './contexts/SupportViewContext'
import type { ModuloId } from './types'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Vendas = lazy(() => import('./pages/Vendas'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Servicos = lazy(() => import('./pages/Servicos'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Layout = lazy(() => import('./components/Layout'))
const AdminSuporte = lazy(() => import('./pages/AdminSuporte'))

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ModuloProtegido({ modulo, children }: { modulo: ModuloId; children: React.ReactNode }) {
  const { podeVer } = useSubUsuario()
  if (!podeVer(modulo)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 font-medium">Acesso não autorizado</p>
          <p className="text-gray-400 text-sm mt-1">Você não tem permissão para acessar este módulo</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
      <SupportViewProvider>
      <BrandProvider>
      <SubUsuarioProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
            },
          }}
        />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/suporte" element={<ProtectedRoute><AdminSuporte /></ProtectedRoute>} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<ModuloProtegido modulo="dashboard"><Dashboard /></ModuloProtegido>} />
              <Route path="/vendas" element={<ModuloProtegido modulo="vendas"><Vendas /></ModuloProtegido>} />
              <Route path="/agenda" element={<ModuloProtegido modulo="agenda"><Agenda /></ModuloProtegido>} />
              <Route path="/clientes" element={<ModuloProtegido modulo="clientes"><Clientes /></ModuloProtegido>} />
              <Route path="/servicos" element={<ModuloProtegido modulo="servicos"><Servicos /></ModuloProtegido>} />
              <Route path="/financeiro" element={<ModuloProtegido modulo="financeiro"><Financeiro /></ModuloProtegido>} />
              <Route path="/configuracoes" element={<ModuloProtegido modulo="configuracoes"><Configuracoes /></ModuloProtegido>} />
              <Route path="/usuarios" element={<ModuloProtegido modulo="usuarios"><Usuarios /></ModuloProtegido>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SubUsuarioProvider>
      </BrandProvider>
      </SupportViewProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
