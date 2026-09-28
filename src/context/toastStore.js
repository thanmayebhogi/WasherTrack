import { createContext, useContext } from 'react'
import { uid } from '../utils/time.js'

export const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() must be used inside <ToastProvider>')
  return ctx
}

export const createToast = (toast) => ({
  id: uid('ts'),
  tone: 'info',
  title: '',
  message: '',
  ...toast,
})
