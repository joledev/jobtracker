import type { ComponentProps } from 'react'

const sizes = {
  sm: 16,
  md: 24,
  lg: 32,
} as const

interface SpinnerProps extends Omit<ComponentProps<'svg'>, 'children'> {
  size?: keyof typeof sizes
}

export const Spinner = ({ size = 'md', className = '', ...props }: SpinnerProps) => {
  const px = sizes[size]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
  )
}
