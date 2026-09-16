import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ArrowDownLeft, ArrowUpRight, Linkedin, Mail, MessageCircle, Trash2 } from 'lucide-react'
import type {
  Communication,
  CommunicationChannel,
  CreateCommunicationInput,
} from '@/types/api'

const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const channelOptions = [
  { value: 'email', label: 'Correo' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Otro' },
]

const directionOptions = [
  { value: 'inbound', label: 'Recibido' },
  { value: 'outbound', label: 'Enviado' },
]

const channelIcon = (channel: CommunicationChannel) => {
  if (channel === 'linkedin') return <Linkedin size={12} />
  if (channel === 'whatsapp') return <MessageCircle size={12} />
  return <Mail size={12} />
}

const channelLabel = (channel: CommunicationChannel) =>
  channelOptions.find((o) => o.value === channel)?.label ?? 'Otro'

const emptyForm = (): CreateCommunicationInput => ({
  occurredAt: new Date().toISOString().slice(0, 16),
  channel: 'email',
  direction: 'inbound',
})

interface CommunicationsTabProps {
  offerId: string
}

export const CommunicationsTab = ({ offerId }: CommunicationsTabProps) => {
  const api = useApi()
  const [items, setItems] = useState<Communication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateCommunicationInput>(emptyForm)

  const load = async () => {
    setIsLoading(true)
    try {
      setItems(await api.offers.listCommunications(offerId))
      setError(null)
    } catch {
      setItems([])
      // Sin esto, un fallo de red se veia igual que "no hay nada registrado",
      // que es justo la confusion que no conviene en una bitacora de contacto.
      setError('No se pudieron cargar las comunicaciones')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [offerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!form.occurredAt) return
    setIsSaving(true)
    try {
      const created = await api.offers.addCommunication(offerId, {
        ...form,
        occurredAt: new Date(form.occurredAt).toISOString(),
      })
      setItems((prev) => [created, ...prev])
      setForm(emptyForm())
      setError(null)
    } catch {
      setError('No se pudo guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (commId: string) => {
    const previos = items
    // Se quita de la lista antes de confirmar, pero se guarda la lista anterior:
    // si el borrado falla, vuelve en vez de desaparecer de la pantalla sin haberse
    // borrado de verdad.
    setItems((prev) => prev.filter((i) => i.id !== commId))
    try {
      await api.offers.deleteCommunication(offerId, commId)
    } catch {
      setItems(previos)
      setError('No se pudo borrar')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {error && <p className="text-sm text-status-rejected">{error}</p>}

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="group rounded-md bg-bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                    {channelIcon(item.channel)} {channelLabel(item.channel)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs ${
                      item.direction === 'inbound' ? 'text-status-applied' : 'text-status-interview'
                    }`}
                  >
                    {item.direction === 'inbound' ? (
                      <>
                        <ArrowDownLeft size={12} /> Recibido
                      </>
                    ) : (
                      <>
                        <ArrowUpRight size={12} /> Enviado
                      </>
                    )}
                  </span>
                  {item.contactName && (
                    <span className="truncate text-sm font-medium text-text-primary">
                      {item.contactName}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-text-muted">{formatDateTime(item.occurredAt)}</span>
                  <button
                    type="button"
                    aria-label="Borrar"
                    onClick={() => handleDelete(item.id)}
                    className="text-text-muted opacity-0 transition-opacity hover:text-status-rejected group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {item.subject && (
                <p className="mt-1 text-sm font-medium text-text-primary">{item.subject}</p>
              )}
              {item.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{item.body}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No hay comunicaciones registradas</p>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-text-secondary">Registrar comunicacion</p>
        <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
          <div className="grid grid-cols-3 gap-2">
            <Select
              options={channelOptions}
              value={form.channel ?? 'email'}
              onChange={(e) =>
                setForm((p) => ({ ...p, channel: e.target.value as CommunicationChannel }))
              }
            />
            <Select
              options={directionOptions}
              value={form.direction ?? 'inbound'}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  direction: e.target.value as Communication['direction'],
                }))
              }
            />
            <Input
              type="datetime-local"
              value={form.occurredAt}
              onChange={(e) => setForm((p) => ({ ...p, occurredAt: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Asunto"
            value={form.subject || ''}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
          />
          <Textarea
            placeholder="Contenido del mensaje..."
            rows={3}
            value={form.body || ''}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          />
          <Button size="sm" onClick={handleSubmit} loading={isSaving}>
            Registrar
          </Button>
        </div>
      </div>
    </div>
  )
}
