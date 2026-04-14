import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { BrandProvider } from './contexts/BrandContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SubUsuarioProvider } from './contexts/SubUsuarioContext'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Vendas = lazy(() => import('./pages/Vendas'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Checklists = lazy(() => import('./pages/Checklists'))
const NovoChecklist = lazy(() => import('./pages/NovoChecklist'))
const VisualizarChecklist = lazy(() => import('./pages/VisualizarChecklist'))
const Servicos = lazy(() => import('./pages/Servicos'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Layout = lazy(() => import('./components/Layout'))

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

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <BrandProvider>
      <AuthProvider>
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
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/checklists" element={<Checklists />} />
              <Route path="/novo-checklist" element={<NovoChecklist />} />
              <Route path="/checklist/:id" element={<VisualizarChecklist />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SubUsuarioProvider>
      </AuthProvider>
      </BrandProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
