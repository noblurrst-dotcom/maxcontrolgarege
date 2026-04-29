// =============================================================================
// Wrapper de react-hot-toast com gate por superadmin
// =============================================================================
// Toasts (success/error/loading/custom/promise) só aparecem para superadmins.
// Usuários normais não veem nenhuma notificação visual.
//
// A flag é controlada por `setToastSuperAdmin(value)` chamada em Layout.tsx
// após `useIsSuperAdmin()` resolver. Persiste em sessionStorage para que
// refresh subsequentes tenham a flag setada rapidamente.

import baseToast, {
  Toaster as BaseToaster,
  type Toast,
  type ToastOptions,
  type Renderable,
  type ValueOrFunction,
} from 'react-hot-toast'

const STORAGE_KEY = '__toast_superadmin'

function readInitial(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

let _isSuperAdmin = readInitial()

export function setToastSuperAdmin(value: boolean): void {
  _isSuperAdmin = value
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function isToastEnabled(): boolean {
  return _isSuperAdmin
}

// "id" stub retornado pelas funções no-op
const NOOP_ID = ''

// Resolve uma mensagem (que pode ser string ou ValueOrFunction) p/ promise.then
function resolveMsg<T>(msg: ValueOrFunction<Renderable, T>, value: T): Renderable {
  if (typeof msg === 'function') {
    return (msg as (v: T) => Renderable)(value)
  }
  return msg
}

type ToastFn = (message: Renderable, options?: ToastOptions) => string

const toast = ((message: Renderable, options?: ToastOptions): string => {
  if (!_isSuperAdmin) return NOOP_ID
  return baseToast(message, options)
}) as ToastFn & {
  success: ToastFn
  error: ToastFn
  loading: ToastFn
  custom: ToastFn
  blank: ToastFn
  dismiss: typeof baseToast.dismiss
  remove: typeof baseToast.remove
  promise: typeof baseToast.promise
}

toast.success = ((message, options) =>
  _isSuperAdmin ? baseToast.success(message, options) : NOOP_ID) as ToastFn

toast.error = ((message, options) =>
  _isSuperAdmin ? baseToast.error(message, options) : NOOP_ID) as ToastFn

toast.loading = ((message, options) =>
  _isSuperAdmin ? baseToast.loading(message, options) : NOOP_ID) as ToastFn

toast.custom = ((message, options) =>
  _isSuperAdmin ? baseToast.custom(message, options) : NOOP_ID) as ToastFn

toast.blank = ((message, options) =>
  _isSuperAdmin ? baseToast(message, options) : NOOP_ID) as ToastFn

// dismiss/remove são seguros — não criam toast, apenas removem
toast.dismiss = baseToast.dismiss
toast.remove = baseToast.remove

// promise: para non-superadmin, devolve a promise original sem mostrar nada
toast.promise = (<T,>(
  promise: Promise<T>,
  msgs: { loading: Renderable; success: ValueOrFunction<Renderable, T>; error: ValueOrFunction<Renderable, any> },
  opts?: any
): Promise<T> => {
  if (_isSuperAdmin) {
    return baseToast.promise(promise, msgs, opts)
  }
  // No-op: ainda resolve a promise normalmente
  return promise.then(
    (v) => {
      void resolveMsg(msgs.success, v)
      return v
    },
    (e) => {
      void resolveMsg(msgs.error, e)
      throw e
    },
  )
}) as typeof baseToast.promise

// Re-exporta Toaster e tipo Toast para conveniência
export { BaseToaster as Toaster }
export type { Toast }

export default toast
