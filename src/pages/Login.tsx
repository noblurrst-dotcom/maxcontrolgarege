import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, UserPlus, Eye, EyeOff, AlertTriangle, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

const BRAND = '#3657a3'
const BRAND_DARK = '#2a4580'

type View = 'login' | 'register' | 'forgot'

export default function Login() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null)
  const { signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, configured } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (view === 'login') {
        const { error } = await signIn(email, password)
        if (error) { toast.error('Email ou senha incorretos'); return }
        toast.success('Login realizado com sucesso!')
        navigate('/')
      } else if (view === 'register') {
        if (!nome.trim()) { toast.error('Informe seu nome'); return }
        const { error } = await signUp(email, password, nome)
        if (error) { toast.error(error.message || 'Erro ao criar conta'); return }
        toast.success('Conta criada! Verifique seu email para confirmar.')
        setView('login')
      } else if (view === 'forgot') {
        if (!email.trim()) { toast.error('Informe seu email'); return }
        const { error } = await resetPassword(email)
        if (error) { toast.error(error.message || 'Erro ao enviar email'); return }
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.')
        setView('login')
      }
    } catch {
      toast.error('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setSocialLoading('google')
    try {
      const { error } = await signInWithGoogle()
      if (error) toast.error('Erro ao conectar com Google')
    } catch { toast.error('Erro inesperado') }
    finally { setSocialLoading(null) }
  }

  // Apple login - habilitar quando configurar Apple Developer Account
  const _handleApple = async () => {
    setSocialLoading('apple')
    try {
      const { error } = await signInWithApple()
      if (error) toast.error('Erro ao conectar com Apple')
    } catch { toast.error('Erro inesperado') }
    finally { setSocialLoading(null) }
  }
  void _handleApple

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row overflow-hidden">
      {/* === LADO ESQUERDO - Espaço para animação (desktop only) === */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-white/20 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 text-center px-12 max-w-lg">
          <img src="/kv/logo-compress/KV_Full_comprimido.webp" alt="A.T.A Gestão" className="h-20 w-auto mx-auto mb-10" />
          <h1 className="text-4xl font-bold text-white tracking-tight">A.T.A Gestão</h1>
          <p className="text-white/70 mt-3 text-lg">Plataforma de gestão para estética automotiva</p>
          <div className="mt-8 flex items-center gap-3 justify-center">
            <div className="w-12 h-1 rounded-full bg-white/30" />
            <div className="w-12 h-1 rounded-full bg-white/60" />
            <div className="w-12 h-1 rounded-full bg-white/30" />
          </div>
          <p className="text-white/40 mt-8 text-sm leading-relaxed">
            Gerencie agendamentos, clientes, vendas e serviços em um só lugar.
          </p>
        </div>
      </div>

      {/* === LADO DIREITO - Formulário (mobile: tela inteira) === */}
      <div className="flex-1 flex flex-col min-h-[100dvh] lg:min-h-0 bg-white lg:bg-gray-50">

        {/* Header mobile com gradiente */}
        <div
          className="lg:hidden w-full pt-[env(safe-area-inset-top)] pb-6 px-6 flex flex-col items-center"
          style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
        >
          <div className="pt-8 pb-2 flex flex-col items-center">
            <img src="/kv/logo-compress/KV_Favicon_white_comprimido.webp" alt="A.T.A Gestão" className="w-[72px] h-[72px] mb-4" />
            <h1 className="text-xl font-bold text-white tracking-tight">A.T.A Gestão</h1>
            <p className="text-white/60 text-xs mt-0.5">Plataforma de gestão</p>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-8 lg:px-12 py-6 sm:py-8 overflow-y-auto">
          <div className="w-full max-w-[400px]">

            {/* Título */}
            <div className="mb-6">
              {view === 'forgot' && (
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="flex items-center gap-1.5 text-sm font-medium mb-3 transition-colors hover:opacity-80"
                  style={{ color: BRAND }}
                >
                  <ArrowLeft size={16} /> Voltar ao login
                </button>
              )}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                {view === 'login' && 'Bem-vindo de volta'}
                {view === 'register' && 'Crie sua conta'}
                {view === 'forgot' && 'Recuperar senha'}
              </h2>
              <p className="text-gray-400 mt-1 text-sm">
                {view === 'login' && 'Entre na sua conta para continuar'}
                {view === 'register' && 'Preencha os dados para começar'}
                {view === 'forgot' && 'Enviaremos um link de recuperação'}
              </p>
            </div>

            {/* Supabase warning */}
            {!configured && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Supabase não configurado</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Configure o <code className="bg-amber-100 px-1 rounded">.env</code> com suas credenciais.
                  </p>
                </div>
              </div>
            )}

            {/* Social login */}
            {view !== 'forgot' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mb-5 active:scale-[0.98]"
                >
                  {socialLoading === 'google' ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                  )}
                  Continuar com Google
                </button>

                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white lg:bg-gray-50 px-4 text-gray-400 font-medium">ou continue com email</span>
                  </div>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {view === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 bg-gray-50 lg:bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:border-transparent outline-none transition-all"
                    style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 bg-gray-50 lg:bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:border-transparent outline-none transition-all"
                  style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                />
              </div>

              {view !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Senha</label>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs font-medium hover:underline transition-colors"
                        style={{ color: BRAND }}
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 bg-gray-50 lg:bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:border-transparent outline-none transition-all pr-12"
                      style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98] !mt-5"
                style={{ backgroundColor: BRAND }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND_DARK)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND)}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : view === 'login' ? (
                  <><LogIn size={18} /> Entrar</>
                ) : view === 'register' ? (
                  <><UserPlus size={18} /> Criar conta</>
                ) : (
                  <><Mail size={18} /> Enviar link de recuperação</>
                )}
              </button>
            </form>

            {/* Toggle login / register */}
            {view !== 'forgot' && (
              <p className="text-center mt-5 text-sm text-gray-500">
                {view === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
                <button
                  type="button"
                  onClick={() => setView(view === 'login' ? 'register' : 'login')}
                  className="font-semibold hover:underline transition-colors"
                  style={{ color: BRAND }}
                >
                  {view === 'login' ? 'Criar conta grátis' : 'Fazer login'}
                </button>
              </p>
            )}

            {/* Resend badge */}
            <p className="text-center mt-6 text-[11px] text-gray-300">
              Emails enviados com <span className="font-medium">Resend</span>
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
