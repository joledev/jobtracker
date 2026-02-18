import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { PhoneCall, CreateCallInput } from '@/types/api'

const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const callTypeOptions = [
  { value: 'inbound', label: 'Entrada' },
  { value: 'outbound', label: 'Salida' },
]

interface CallsTabProps {
  offerId: string
}

export const CallsTab = ({ offerId }: CallsTabProps) => {
  const api = useApi()
  const [calls, setCalls] = useState<PhoneCall[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<CreateCallInput>({
    calledAt: new Date().toISOString().slice(0, 16),
    callType: 'inbound',
  })

  const loadCalls = async () => {
    setIsLoading(true)
    try {
      const data = await api.offers.listCalls(offerId)
      setCalls(data)
    } catch {
      setCalls([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCalls()
  }, [offerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!form.calledAt) return
    setIsSaving(true)
    try {
      const created = await api.offers.addCall(offerId, {
        ...form,
        calledAt: new Date(form.calledAt).toISOString(),
      })
      setCalls((prev) => [created, ...prev])
      setForm({
        calledAt: new Date().toISOString().slice(0, 16),
        callType: 'inbound',
      })
    } finally {
      setIsSaving(false)
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
      {calls.length > 0 ? (
        <div className="space-y-2">
          {calls.map((call) => (
            <div key={call.id} className="rounded-md bg-bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {call.phoneNumber || call.contactName || 'Desconocido'}
                  </span>
                  <span className={`text-xs ${call.callType === 'inbound' ? 'text-status-applied' : 'text-status-interview'}`}>
                    {call.callType === 'inbound' ? '← Entrada' : '→ Salida'}
                  </span>
                </div>
                <span className="text-xs text-text-muted">{formatDateTime(call.calledAt)}</span>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-text-muted">
                {call.durationMinutes != null && <span>{call.durationMinutes} min</span>}
              </div>
              {call.notes && (
                <p className="mt-1 text-sm text-text-secondary">{call.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No hay llamadas registradas</p>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-text-secondary">Registrar llamada</p>
        <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Numero de telefono"
              value={form.phoneNumber || ''}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
            />
            <Input
              type="datetime-local"
              value={form.calledAt}
              onChange={(e) => setForm((p) => ({ ...p, calledAt: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={form.durationMinutes?.toString() || ''}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value ? Number(e.target.value) : undefined }))}
              />
              <Select
                options={callTypeOptions}
                value={form.callType || 'inbound'}
                onChange={(e) => setForm((p) => ({ ...p, callType: e.target.value }))}
              />
            </div>
          </div>
          <Textarea
            placeholder="Notas de la llamada..."
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <Button size="sm" onClick={handleSubmit} loading={isSaving}>
            Registrar
          </Button>
        </div>
      </div>
    </div>
  )
}
