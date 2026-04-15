import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface SupportViewData {
  vendas: any[]
  pre_vendas: any[]
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

export function SupportViewProvider({ children }: { children: ReactNode }) {
  const [supportUserId, setSupportUserId] = useState<string | null>(null)
  const [supportInfo, setSupportInfo] = useState<SupportViewInfo | null>(null)
  const [supportData, setSupportData] = useState<SupportViewData | null>(null)

  const startSupportView = useCallback((
    userId: string,
    info: SupportViewInfo,
    data: SupportViewData
  ) => {
    setSupportUserId(userId)
    setSupportInfo(info)
    setSupportData(data)
  }, [])

  const endSupportView = useCallback(() => {
    setSupportUserId(null)
    setSupportInfo(null)
    setSupportData(null)
  }, [])

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
