// ============================================
// Utilitários compartilhados - Segurança + Performance
// ============================================

// --- ID Seguro (crypto-random) ---
export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback com crypto.getRandomValues (mais seguro que Math.random)
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

// --- Formatação de moeda ---
export function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// --- Sanitização de inputs ---
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

export function sanitize(str: string): string {
  if (!str) return ''
  return String(str).replace(/[&<>"'/]/g, (c) => HTML_ENTITIES[c] || c)
}

export function sanitizeObj<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    const val = result[key]
    if (typeof val === 'string') {
      ;(result as Record<string, unknown>)[key] = sanitize(val)
    }
  }
  return result
}

// --- localStorage seguro ---
export function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) && typeof parsed !== 'object') return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function safeSetStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn(`[Storage] Erro ao salvar "${key}":`, e)
  }
}

// --- Validação de email ---
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// --- Validação de telefone ---
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13
}

// --- Sanitizar telefone para WhatsApp ---
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits || digits.length < 10) return ''
  return digits.startsWith('55') ? digits : '55' + digits
}

// --- Debounce ---
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// --- Throttle ---
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let last = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
    }
  }
}

// --- Parse seguro de números ---
export function safeParseFloat(value: string, fallback = 0): number {
  const parsed = parseFloat(value)
  return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed
}

// --- Truncar texto ---
export function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str
  return str.slice(0, max) + '…'
}
