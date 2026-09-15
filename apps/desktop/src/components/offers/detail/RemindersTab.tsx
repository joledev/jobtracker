import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Calendar, Video, MapPin, Check, Trash2, ExternalLink } from 'lucide-react'
import type { Reminder, CreateReminderInput } from '@/types/api'

const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const locationTypeOptions = [
  { value: 'video', label: 'Videollamada' },
  { value: 'in_person', label: 'Presencial' },
]

const isPast = (dateStr: string): boolean => new Date(dateStr) < new Date()

interface RemindersTabProps {
  offerId: string
}

export const RemindersTab = ({ offerId }: RemindersTabProps) => {
  const api = useApi()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<CreateReminderInput>({
    title: '',
    scheduledAt: new Date().toISOString().slice(0, 16),
    locationType: 'video',
  })

  const loadReminders = async () => {
    setIsLoading(true)
    try {
      const data = await api.offers.listReminders(offerId)
      setReminders(data)
    } catch {
      setReminders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReminders()
  }, [offerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!form.title || !form.scheduledAt) return
    setIsSaving(true)
    try {
      const created = await api.offers.createReminder(offerId, {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      })
      setReminders((prev) => [...prev, created].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)))
      setForm({
        title: '',
        scheduledAt: new Date().toISOString().slice(0, 16),
        locationType: 'video',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async (reminderId: string) => {
    try {
      const updated = await api.offers.completeReminder(offerId, reminderId)
      setReminders((prev) => prev.map((r) => r.id === reminderId ? { ...r, completedAt: updated.completedAt } : r))
    } catch {
      // silent
    }
  }

  const handleDelete = async (reminderId: string) => {
    try {
      await api.offers.deleteReminder(offerId, reminderId)
      setReminders((prev) => prev.filter((r) => r.id !== reminderId))
    } catch {
      // silent
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const pending = reminders.filter((r) => !r.completedAt)
  const completed = reminders.filter((r) => r.completedAt)

  return (
    <div className="space-y-4 p-4">
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((reminder) => (
            <div
              key={reminder.id}
              className={`rounded-md bg-bg-card p-3 ${isPast(reminder.scheduledAt) ? 'border border-status-rejected/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-text-muted" />
                  <span className="text-sm font-medium text-text-primary">{reminder.title}</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${reminder.locationType === 'video' ? 'text-status-applied' : 'text-status-interview'}`}>
                    {reminder.locationType === 'video' ? <><Video size={12} /> Videollamada</> : <><MapPin size={12} /> Presencial</>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isPast(reminder.scheduledAt) ? 'text-status-rejected' : 'text-text-muted'}`}>
                    {formatDateTime(reminder.scheduledAt)}
                  </span>
                  <button onClick={() => handleComplete(reminder.id)} className="text-text-muted hover:text-status-accepted transition-colors" title="Marcar completado">
                    <Check size={14} />
                  </button>
                  <button onClick={() => handleDelete(reminder.id)} className="text-text-muted hover:text-status-rejected transition-colors" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-text-muted">
                {reminder.contactName && <span>Con: {reminder.contactName}</span>}
                {reminder.locationType === 'video' && reminder.videoLink && (
                  <a href={reminder.videoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-status-applied hover:underline">
                    <ExternalLink size={10} /> Link
                  </a>
                )}
                {reminder.locationType === 'in_person' && reminder.address && (
                  <span>{reminder.address}</span>
                )}
              </div>
              {reminder.notes && (
                <p className="mt-1 text-sm text-text-secondary">{reminder.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && completed.length === 0 && (
        <p className="text-sm text-text-muted">No hay recordatorios</p>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-muted">Completados</p>
          {completed.map((reminder) => (
            <div key={reminder.id} className="rounded-md bg-bg-card p-3 opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-status-accepted" />
                  <span className="text-sm text-text-secondary line-through">{reminder.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{formatDateTime(reminder.scheduledAt)}</span>
                  <button onClick={() => handleDelete(reminder.id)} className="text-text-muted hover:text-status-rejected transition-colors" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-text-secondary">Nuevo recordatorio</p>
        <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Titulo (ej. Screening, Entrevista tecnica)"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
            />
            <Select
              options={locationTypeOptions}
              value={form.locationType}
              onChange={(e) => setForm((p) => ({ ...p, locationType: e.target.value as 'video' | 'in_person' }))}
            />
          </div>
          {form.locationType === 'video' ? (
            <Input
              placeholder="Link de videollamada (ej. https://meet.google.com/...)"
              value={form.videoLink || ''}
              onChange={(e) => setForm((p) => ({ ...p, videoLink: e.target.value, address: undefined }))}
            />
          ) : (
            <Input
              placeholder="Direccion o ubicacion"
              value={form.address || ''}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value, videoLink: undefined }))}
            />
          )}
          <Textarea
            placeholder="Notas..."
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <Button size="sm" onClick={handleSubmit} loading={isSaving} disabled={!form.title || !form.scheduledAt}>
            Agregar
          </Button>
        </div>
      </div>
    </div>
  )
}
