interface TechTagProps {
  name: string
  onRemove?: () => void
}

export const TechTag = ({ name, onRemove }: TechTagProps) => {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-bg-hover px-2 py-0.5 text-xs text-text-secondary">
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          &times;
        </button>
      )}
    </span>
  )
}
