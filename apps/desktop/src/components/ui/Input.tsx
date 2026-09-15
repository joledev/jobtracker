import { forwardRef, type ComponentProps } from 'react'

interface InputProps extends ComponentProps<'input'> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary ${
            error ? 'border-status-rejected' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-status-rejected">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      </div>
    )
  },
)
