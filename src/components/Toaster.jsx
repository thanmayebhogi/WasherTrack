import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToast } from '../context/toastStore.js'

const ICONS = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
}

export default function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone] || Info
        return (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span className="toast__icon">
              <Icon size={18} />
            </span>
            <div className="toast__content">
              {toast.title ? <strong>{toast.title}</strong> : null}
              {toast.message ? <p>{toast.message}</p> : null}
            </div>
            <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
