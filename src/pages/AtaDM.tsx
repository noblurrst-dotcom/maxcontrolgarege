import { MessageSquare, Instagram, Facebook, Phone, Music2, Lock, Rocket } from 'lucide-react'

const CANAIS = [
  { nome: 'WhatsApp', icon: Phone, cor: 'bg-green-100 text-green-600', badge: 'bg-green-500' },
  { nome: 'Instagram', icon: Instagram, cor: 'bg-pink-100 text-pink-600', badge: 'bg-pink-500' },
  { nome: 'Facebook', icon: Facebook, cor: 'bg-blue-100 text-blue-600', badge: 'bg-blue-500' },
  { nome: 'TikTok', icon: Music2, cor: 'bg-gray-100 text-gray-600', badge: 'bg-gray-900' },
]

export default function AtaDM() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div className="text-center pt-4">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={32} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">A.T.A DM</h1>
        <p className="text-sm text-gray-500 mt-1">Inbox unificado — todas as suas mensagens em um só lugar</p>
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-warning-100 text-warning-700 rounded-full text-xs font-bold">
          <Rocket size={14} />
          Disponível em breve
        </div>
      </div>

      {/* Preview: canais */}
      <div className="grid grid-cols-2 gap-3">
        {CANAIS.map((canal) => (
          <div key={canal.nome} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 opacity-75">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${canal.cor}`}>
                <canal.icon size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{canal.nome}</p>
                <p className="text-[10px] text-gray-400">DMs + Comentários</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Lock size={12} />
              <span className="text-[11px]">Aguardando conexão</span>
            </div>
          </div>
        ))}
      </div>

      {/* Preview: inbox mockup */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">Inbox unificado</p>
          <p className="text-[11px] text-gray-400">Todas as conversas aparecerão aqui</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3 opacity-40">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                <div className="h-2.5 bg-gray-100 rounded w-2/3 animate-pulse" />
              </div>
              <div className="text-right space-y-1.5">
                <div className="h-2 bg-gray-100 rounded w-10 animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* O que vem por aí */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3">O que vem por aí</h3>
        <ul className="space-y-2.5">
          {[
            'Receber e responder mensagens do WhatsApp Business',
            'DMs e comentários do Instagram em tempo real',
            'Mensagens do Facebook Messenger + comentários de posts',
            'Comentários do TikTok (leitura)',
            'Etiquetas e filtros por canal, status e cliente',
            'Integração com cadastro de clientes da A.T.A',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary-200 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary-700">{i + 1}</span>
              </div>
              <span className="text-xs text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
