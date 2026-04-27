import React from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.tsx'
import './index.css'

/*
 * Versão atual do cache. Deve bater com CACHE_NAME em public/sw.js.
 * Bump quando quiser forçar todos os browsers a descartar o cache existente.
 */
const CACHE_VERSAO_ATUAL = 'ata-gestao-v3'

/*
 * Limpeza defensiva de caches obsoletos de versões anteriores.
 * O SW ativo também limpa no 'activate', mas esta camada defensiva
 * cobre usuários cujo SW antigo está servindo o HTML em cache-first
 * (e portanto nunca recebeu o novo 'activate' até agora).
 */
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      if (name !== CACHE_VERSAO_ATUAL) {
        caches.delete(name).catch(() => {})
      }
    })
  }).catch(() => {})
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Força update check imediato (útil quando o usuário fica com a mesma aba aberta)
        registration.update().catch(() => {})
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
