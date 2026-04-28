import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { safeGetStorage, safeSetStorage } from '../lib/utils'
import { useSupportView } from '../contexts/SupportViewContext'
import toast from 'react-hot-toast'

// =====================================================================
// useCloudSync — Sincroniza arrays de dados com Supabase + localStorage
// =====================================================================
// Para tabelas que guardam arrays (vendas, agendamentos, clientes, etc.)
// Fluxo: Supabase → state + localStorage (leitura), state + localStorage + Supabase (escrita)

interface UseCloudSyncOptions {
  table: string               // nome da tabela no Supabase
  storageKey: string           // chave no localStorage
  userIdField?: string         // campo que guarda o user_id (default: 'user_id')
  orderBy?: string             // campo para ordenação (default: 'created_at')
  orderAsc?: boolean           // ascending? (default: false)
}

export function useCloudSync<T extends Record<string, any>>(
  options: UseCloudSyncOptions
) {
  const { table, storageKey, userIdField = 'user_id', orderBy = 'created_at', orderAsc = false } = options
  const { user } = useAuth()
  const { isSupport, supportData } = useSupportView()
  const [data, setData] = useState<T[]>(() => {
    // In support mode, use pre-loaded data immediately
    if (isSupport && supportData && (supportData as any)[table]) {
      return (supportData as any)[table] as T[]
    }
    return safeGetStorage<T[]>(storageKey, [])
  })
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  // When entering/exiting support mode, update data accordingly
  useEffect(() => {
    if (isSupport && supportData && (supportData as any)[table]) {
      setData((supportData as any)[table] as T[])
      setLoading(false)
      setSynced(true)
    }
  }, [isSupport, supportData, table])

  // Load from Supabase on mount / user change
  useEffect(() => {
    if (isSupport) return // Skip Supabase load in support mode
    if (!user || !isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let cancelled = false

    const loadFromCloud = async () => {
      try {
        const { data: rows, error } = await supabase
          .from(table)
          .select('*')
          .eq(userIdField, user.id)
          .order(orderBy, { ascending: orderAsc })

        if (cancelled) return

        if (error) {
          console.warn(`[CloudSync] Erro ao carregar "${table}":`, error.message)
          // Keep localStorage data as fallback
          setLoading(false)
          return
        }

        if (rows && rows.length > 0) {
          // Cloud has data → use it
          setData(rows as T[])
          safeSetStorage(storageKey, rows)
        } else {
          // Cloud is empty — push local data up (first-time migration)
          const local = safeGetStorage<T[]>(storageKey, [])
          if (local.length > 0) {
            const toInsert = local.map((item) => ({
              ...item,
              [userIdField]: user.id,
            }))
            const { error: insertErr } = await supabase.from(table).upsert(toInsert, { onConflict: 'id' })
            if (insertErr) console.warn(`[CloudSync] Erro ao migrar "${table}":`, insertErr.message)
          }
        }

        if (isMounted.current) {
          setSynced(true)
          setLoading(false)
        }
      } catch (err) {
        console.warn(`[CloudSync] Erro inesperado "${table}":`, err)
        if (isMounted.current) setLoading(false)
      }
    }

    loadFromCloud()
    return () => { cancelled = true }
  }, [user, table]) // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: detecta IDs que existem em `before` mas não em `after` → foram removidos
  const dataRef = useRef<T[]>(data)
  useEffect(() => { dataRef.current = data }, [data])

  // Save function: read-only in support mode
  const save = useCallback(async (items: T[]) => {
    if (isSupport) return // read-only in support mode

    // Detecta IDs removidos comparando com snapshot anterior
    const idsAntes = new Set(dataRef.current.map(i => (i as any).id).filter(Boolean))
    const idsDepois = new Set(items.map(i => (i as any).id).filter(Boolean))
    const idsRemovidos = [...idsAntes].filter(id => !idsDepois.has(id))

    setData(items)
    safeSetStorage(storageKey, items)

    if (!user || !isSupabaseConfigured) return

    try {
      // 1) UPSERT dos itens atuais
      if (items.length > 0) {
        const toInsert = items.map((item) => ({ ...item, [userIdField]: user.id }))
        const { error: upErr } = await supabase.from(table).upsert(toInsert, { onConflict: 'id' })
        if (upErr) {
          console.error(`[CloudSync] Erro ao salvar "${table}":`, upErr)
          toast.error(`Erro ao salvar ${table}: ${upErr.message}`, { duration: 6000 })
          return // não deleta nada — preserva dados do banco
        }
      }

      // 2) DELETE direto por id dos itens removidos (in ('uuid1','uuid2'))
      if (idsRemovidos.length > 0) {
        const { error: delErr } = await supabase
          .from(table).delete()
          .eq(userIdField, user.id)
          .in('id', idsRemovidos)
        if (delErr) {
          console.error(`[CloudSync] Erro ao remover de "${table}":`, delErr)
          toast.error(`Erro ao remover de ${table}: ${delErr.message}`, { duration: 6000 })
        }
      }
    } catch (err: any) {
      console.error(`[CloudSync] Erro ao sincronizar "${table}":`, err)
      toast.error(`Erro de sincronização: ${err?.message || 'desconhecido'}`, { duration: 6000 })
    }
  }, [user, table, storageKey, userIdField, isSupport])

  // Método explícito para remover ids (útil quando UI já filtrou e quer garantia de delete no banco)
  const remove = useCallback(async (ids: string[]) => {
    if (isSupport || ids.length === 0) return
    setData(prev => prev.filter(i => !ids.includes((i as any).id)))
    safeSetStorage(storageKey, dataRef.current.filter(i => !ids.includes((i as any).id)))
    if (!user || !isSupabaseConfigured) return
    const { error } = await supabase.from(table).delete().eq(userIdField, user.id).in('id', ids)
    if (error) {
      console.error(`[CloudSync] Erro ao remover de "${table}":`, error)
      toast.error(`Erro ao remover de ${table}: ${error.message}`, { duration: 6000 })
    }
  }, [user, table, storageKey, userIdField, isSupport])

  return { data, save, remove, loading, synced }
}


// =====================================================================
// useCloudSyncSingle — Para dados "singleton" por usuário (brand_config, dashboard_blocks)
// =====================================================================

interface UseCloudSyncSingleOptions<T> {
  table: string
  storageKey: string
  defaultValue: T
  dataField?: string       // se os dados ficam em uma coluna JSON (ex: 'blocks')
}

export function useCloudSyncSingle<T extends Record<string, any>>(
  options: UseCloudSyncSingleOptions<T>
) {
  const { table, storageKey, defaultValue, dataField } = options
  const { user } = useAuth()
  const [data, setData] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? { ...defaultValue, ...JSON.parse(saved) } : defaultValue
    } catch {
      return defaultValue
    }
  })
  const [loading, setLoading] = useState(true)

  // Load from Supabase
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const { data: row, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (cancelled) return

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found, which is OK for first time
          console.warn(`[CloudSync] Erro ao carregar "${table}":`, error.message)
          setLoading(false)
          return
        }

        if (row) {
          let cloudData: T
          if (dataField) {
            cloudData = row[dataField] as T
          } else {
            // Remove user_id and updated_at from the row to get the data
            const { user_id, updated_at, ...rest } = row
            cloudData = { ...defaultValue, ...rest } as T
          }
          setData(cloudData)
          safeSetStorage(storageKey, cloudData)
        } else {
          // No cloud data — push local up
          const local = data
          await upsertToCloud(local)
        }

        if (isMounted.current) setLoading(false)
      } catch (err) {
        console.warn(`[CloudSync] Erro inesperado "${table}":`, err)
        if (isMounted.current) setLoading(false)
      }
    }

    const isMounted = { current: true }
    load()
    return () => { cancelled = true; isMounted.current = false }
  }, [user, table]) // eslint-disable-line react-hooks/exhaustive-deps

  const upsertToCloud = useCallback(async (value: T) => {
    if (!user || !isSupabaseConfigured) return

    try {
      let row: Record<string, any>
      if (dataField) {
        row = { user_id: user.id, [dataField]: value, updated_at: new Date().toISOString() }
      } else {
        row = { ...value, user_id: user.id, updated_at: new Date().toISOString() }
      }
      const { error } = await supabase.from(table).upsert(row, { onConflict: 'user_id' })
      if (error) console.warn(`[CloudSync] Erro ao salvar "${table}":`, error.message)
    } catch (err) {
      console.warn(`[CloudSync] Erro ao sincronizar "${table}":`, err)
    }
  }, [user, table, dataField])

  const save = useCallback(async (value: T) => {
    setData(value)
    safeSetStorage(storageKey, value)
    await upsertToCloud(value)
  }, [storageKey, upsertToCloud])

  const update = useCallback(async (partial: Partial<T>) => {
    const newData = { ...data, ...partial } as T
    await save(newData)
  }, [data, save])

  return { data, save, update, loading }
}
