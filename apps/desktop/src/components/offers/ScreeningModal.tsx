import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { CreateReminderInput } from '@/types/api'

const locationTypeOptions = [
  { value: 'video', label: 'Videollamada' },
  { value: 'in_person', label: 'Presencial' },
]

interface ScreeningModalProps {
  open: boolean
  onClose: () => void
  contacts: { id: string; name: string }[]
  onConfirm: (data: CreateReminderInput) => Promise<void>
}

export const ScreeningModal = ({ open, onClose, contacts, onConfirm }: ScreeningModalProps) => {
  const [form, setForm] = useState<CreateReminderInput>({
    title: 'Screening',
    scheduledAt: '',
    locationType: 'video',
  })
  const [isSaving, setIsSaving] = useState(false)

  const contactOptions = [
    { value: '', label: 'Sin contacto' },
    ...contacts.map((c) => ({ value: c.id, label: c.name })),
  ]

  const handleConfirm = async () => {
    if (!form.scheduledAt) return
    setIsSaving(true)
    try {
      await onConfirm({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      })
      setForm({ title: 'Screening', scheduledAt: '', locationType: 'video' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setForm({ title: 'Screening', scheduledAt: '', locationType: 'video' })
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Detalles del Screening" size="sm">
      <div className="space-y-3">
        <Input
          label="Fecha y hora"
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
        />
        <Select
          label="Con quien"
          options={contactOptions}
          value={form.contactId || ''}
          onChange={(e) => setForm((p) => ({ ...p, contactId: e.target.value || undefined }))}
        />
        <Select
          label="Modalidad"
          options={locationTypeOptions}
          value={form.locationType}
          onChange={(e) => setForm((p) => ({ ...p, locationType: e.target.value as 'video' | 'in_person' }))}
        />
        {form.locationType === 'video' ? (
          <Input
            label="Link de videollamada"
            placeholder="https://meet.google.com/..."
            value={form.videoLink || ''}
            onChange={(e) => setForm((p) => ({ ...p, videoLink: e.target.value, address: undefined }))}
          />
        ) : (
          <Input
            label="Direccion / ubicacion"
            placeholder="Oficina, calle..."
            value={form.address || ''}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value, videoLink: undefined }))}
          />
        )}
        <Textarea
          label="Notas"
          placeholder="Notas adicionales..."
          rows={2}
          value={form.notes || ''}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={isSaving} disabled={!form.scheduledAt}>
            Confirmar Screening
          </Button>
        </div>
      </div>
    </Modal>
  )
}
