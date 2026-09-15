import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: keyof typeof sizeClasses
}

export const Modal = ({ open, onClose, title, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`relative w-full ${sizeClasses[size]} max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-bg-secondary p-6`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
