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

  // Esconde launcher padrão antes mesmo do script carregar.
  // Esses comandos ficam na fila e são consumidos quando o widget inicializa.
  window.$crisp.push(['safe', true])
  window.$crisp.push(['do', 'chat:hide'])

  // Sempre que o usuário fechar o chat, esconde o launcher de novo —
  // assim só o nosso botão flutuante reabre.
  window.$crisp.push([
    'on',
    'chat:closed',
    () => {
      window.$crisp?.push(['do', 'chat:hide'])
    },
  ])

  // Belt-and-suspenders: CSS que esconde a bolha padrão do Crisp.
  // Cobre o caso de o `chat:hide` falhar em alguma versão do widget.
  const style = document.createElement('style')
  style.setAttribute('data-crisp-overrides', 'true')
  style.textContent = `
    /* Esconde o launcher (bolha) padrão do Crisp — usamos nosso próprio botão */
    .crisp-client .cc-1brb6,
    .crisp-client .cc-kxkl,
    #crisp-chatbox > div > a[aria-label]:not([aria-label*="conversation"]):not([aria-label*="Conversation"]) {
      display: none !important;
    }
  `
  document.head.appendChild(style)

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
  // chat:show é necessário pra `chat:open` funcionar quando a bolha está hidden.
  // Em seguida, o handler on:chat:closed re-esconde a bolha.
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
