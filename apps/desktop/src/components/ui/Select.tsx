import { forwardRef, type ComponentProps } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends ComponentProps<'select'> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm text-text-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-text-secondary ${
            error ? 'border-status-rejected' : 'border-border'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-status-rejected">{error}</p>}
      </div>
    )
  },
)
