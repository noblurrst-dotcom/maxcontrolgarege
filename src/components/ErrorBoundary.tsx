import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV
      return (
        <div style={{ padding: 40, fontFamily: 'sans-serif', background: '#fee2e2', minHeight: '100vh' }}>
          <h1 style={{ color: '#dc2626', fontSize: 24 }}>Erro na aplicação</h1>
          <p style={{ color: '#666', marginTop: 8, fontSize: 16 }}>
            Algo deu errado. Tente recarregar a página.
          </p>
          {isDev && (
            <pre style={{ background: '#fff', padding: 16, borderRadius: 8, marginTop: 16, overflow: 'auto', fontSize: 14, color: '#333' }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Recarregar página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
