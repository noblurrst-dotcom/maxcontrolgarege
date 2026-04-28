import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface SupportViewData {
  vendas: any[]
  orcamentos: any[]
  agendamentos: any[]
  clientes: any[]
  financeiro: any[]
  contas_bancarias: any[]
  kanban_items: any[]
  brand_config: any | null
}

interface SupportViewInfo {
  email: string
  nome: string
}

interface SupportViewContextType {
  isSupport: boolean
  supportUserId: string | null
  supportInfo: SupportViewInfo | null
  supportData: SupportViewData | null
  startSupportView: (userId: string, info: SupportViewInfo, data: SupportViewData) => void
  endSupportView: () => void
}

const SupportViewContext = createContext<SupportViewContextType>({
  isSupport: false,
  supportUserId: null,
  supportInfo: null,
  supportData: null,
  startSupportView: () => {},
  endSupportView: () => {},
})

// Tables to watch in real-time (excludes brand_config which is singleton)
const REALTIME_TABLES = [
  'vendas', 'orcamentos', 'agendamentos', 'clientes',
  'financeiro', 'contas_bancarias', 'kanban_items',
] as const

type RealtimeTable = typeof REALTIME_TABLES[number]

export function SupportViewProvider({ children }: { children: ReactNode }) {
  const [supportUserId, setSupportUserId] = useState<string | null>(null)
  const [supportInfo, setSupportInfo] = useState<SupportViewInfo | null>(null)
  const [supportData, setSupportData] = useState<SupportViewData | null>(null)
  const channelsRef = useRef<RealtimeChannel[]>([])

  const unsubscribeAll = useCallback(() => {
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []
  }, [])

  const subscribeRealtime = useCallback((userId: string) => {
    unsubscribeAll()

    REALTIME_TABLES.forEach(table => {
      const channel = supabase
        .channel(`support-${table}-${userId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table,
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            setSupportData(prev => {
              if (!prev) return prev
              const list = [...(prev[table as RealtimeTable] as any[])]

              if (payload.eventType === 'INSERT') {
                // Avoid duplicates
                if (!list.find((r: any) => r.id === payload.new.id)) {
                  return { ...prev, [table]: [payload.new, ...list] }
                }
              } else if (payload.eventType === 'UPDATE') {
                return {
                  ...prev,
                  [table]: list.map((r: any) => r.id === payload.new.id ? payload.new : r),
                }
              } else if (payload.eventType === 'DELETE') {
                return {
                  ...prev,
                  [table]: list.filter((r: any) => r.id !== payload.old.id),
                }
              }
              return prev
            })
          }
        )
        .subscribe()

      channelsRef.current.push(channel)
    })

    // Also watch brand_config (single row)
    const brandChannel = supabase
      .channel(`support-brand_config-${userId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'brand_config', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          setSupportData(prev => prev ? { ...prev, brand_config: payload.new || null } : prev)
        }
      )
      .subscribe()

    channelsRef.current.push(brandChannel)
  }, [unsubscribeAll])

  const startSupportView = useCallback((
    userId: string,
    info: SupportViewInfo,
    data: SupportViewData
  ) => {
    setSupportUserId(userId)
    setSupportInfo(info)
    setSupportData(data)
    subscribeRealtime(userId)
  }, [subscribeRealtime])

  const endSupportView = useCallback(() => {
    unsubscribeAll()
    setSupportUserId(null)
    setSupportInfo(null)
    setSupportData(null)
  }, [unsubscribeAll])

  return (
    <SupportViewContext.Provider value={{
      isSupport: !!supportUserId,
      supportUserId,
      supportInfo,
      supportData,
      startSupportView,
      endSupportView,
    }}>
      {children}
    </SupportViewContext.Provider>
  )
}

export function useSupportView() {
  return useContext(SupportViewContext)
}
