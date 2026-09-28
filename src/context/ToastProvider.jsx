import { useCallback, useMemo, useRef, useState } from 'react'
import { createToast, ToastContext } from './toastStore.js'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (toast) => {
      const item = createToast(toast)
      setToasts((list) => [...list.slice(-3), item])
      const timer = setTimeout(() => dismiss(item.id), item.duration || 4500)
      timers.current.set(item.id, timer)
      return item.id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      toasts,
      push,
      success: (title, message) => push({ tone: 'success', title, message }),
      error: (title, message) => push({ tone: 'danger', title, message }),
      info: (title, message) => push({ tone: 'info', title, message }),
      warn: (title, message) => push({ tone: 'warning', title, message }),
      dismiss,
    }),
    [toasts, push, dismiss],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
