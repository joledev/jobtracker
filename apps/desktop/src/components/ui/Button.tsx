import type { ComponentProps } from 'react'
import { Spinner } from './Spinner'

const variants = {
  primary: 'bg-bg-hover text-text-primary hover:bg-border',
  secondary: 'border border-border text-text-secondary hover:border-text-secondary hover:text-text-primary',
  ghost: 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
  danger: 'bg-status-rejected/20 text-status-rejected hover:bg-status-rejected/30',
} as const

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
} as const

interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof variants
  size?: keyof typeof sizeClasses
  loading?: boolean
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md transition-colors disabled:opacity-40 ${variants[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
