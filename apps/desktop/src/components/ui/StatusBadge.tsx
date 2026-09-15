const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const sizes = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
} as const

interface StatusBadgeProps {
  stageName: string
  stageColor: string
  size?: keyof typeof sizes
}

export const StatusBadge = ({ stageName, stageColor, size = 'md' }: StatusBadgeProps) => {
  return (
    <span
      className={`inline-block rounded-md font-medium ${sizes[size]}`}
      style={{
        backgroundColor: hexToRgba(stageColor, 0.15),
        color: hexToRgba(stageColor, 0.85),
      }}
    >
      {stageName}
    </span>
  )
}
