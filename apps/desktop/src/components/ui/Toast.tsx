import { useUiStore } from '@/stores/ui'

const typeStyles = {
  info: 'border-text-secondary text-text-primary',
  success: 'border-status-accepted text-status-accepted',
  error: 'border-status-rejected text-status-rejected',
} as const

export const ToastContainer = () => {
  const toasts = useUiStore((s) => s.toasts)
  const removeToast = useUiStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-md border bg-bg-secondary px-4 py-3 shadow-lg ${typeStyles[toast.type]}`}
        >
          <span className="text-sm">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
