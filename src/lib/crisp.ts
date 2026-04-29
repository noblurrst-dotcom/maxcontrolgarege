// =============================================================================
// Crisp Chat — integração leve via script externo
// =============================================================================
// Carrega o widget de forma assíncrona. Se VITE_CRISP_WEBSITE_ID não estiver
// definido, todas as funções viram no-op e o app continua funcionando.
//
// O launcher padrão do Crisp fica escondido — o trigger é o nosso botão
// flutuante (FloatingHelpButton).

const CRISP_ID = import.meta.env.VITE_CRISP_WEBSITE_ID as string | undefined

declare global {
  interface Window {
    $crisp: any[]
    CRISP_WEBSITE_ID: string
  }
}

let initialized = false

export function isCrispEnabled(): boolean {
  return !!CRISP_ID
}

export function initCrisp(): void {
  if (initialized) return
  if (!CRISP_ID) {
    console.warn('[Crisp] VITE_CRISP_WEBSITE_ID não definido — chat de suporte desabilitado')
    return
  }
  if (typeof window === 'undefined') return

  window.$crisp = []
  window.CRISP_WEBSITE_ID = CRISP_ID

  // Esconde launcher padrão antes mesmo do script carregar
  // (essas chamadas ficam na fila e são consumidas quando o widget inicializa)
  window.$crisp.push(['safe', true])
  window.$crisp.push(['do', 'chat:hide'])

  const s = document.createElement('script')
  s.src = 'https://client.crisp.chat/l.js'
  s.async = true
  document.head.appendChild(s)

  initialized = true
}

export function openCrispChat(): void {
  if (!CRISP_ID) {
    alert('Chat de suporte indisponível no momento.')
    return
  }
  if (typeof window === 'undefined') return
  window.$crisp = window.$crisp || []
  window.$crisp.push(['do', 'chat:show'])
  window.$crisp.push(['do', 'chat:open'])
}

export function closeCrispChat(): void {
  if (typeof window === 'undefined' || !window.$crisp) return
  window.$crisp.push(['do', 'chat:close'])
  window.$crisp.push(['do', 'chat:hide'])
}

export function identifyCrispUser(opts: { email: string; nome?: string }): void {
  if (typeof window === 'undefined' || !window.$crisp) return
  if (opts.email) window.$crisp.push(['set', 'user:email', opts.email])
  if (opts.nome) window.$crisp.push(['set', 'user:nickname', opts.nome])
}

export function resetCrispUser(): void {
  if (typeof window === 'undefined' || !window.$crisp) return
  window.$crisp.push(['do', 'session:reset'])
}
