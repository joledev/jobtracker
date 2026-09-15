import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import type { ApiKey } from '@/types/api'

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

export const ApiKeysSettings = () => {
  const api = useApi()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const data = await api.apiKeys.list()
      setKeys(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!newLabel.trim()) return
    setIsCreating(true)
    try {
      const result = await api.apiKeys.create({ label: newLabel.trim() })
      setRawKey(result.rawKey)
      setNewLabel('')
      await load()
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Revocar esta key? No podras usarla de nuevo.')) return
    try {
      await api.apiKeys.revoke(id)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al revocar')
    }
  }

  const handleCopy = async () => {
    if (!rawKey) return
    await navigator.clipboard.writeText(rawKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false)
    setRawKey(null)
    setNewLabel('')
    setCopied(false)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">API Keys</h3>
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          + Nueva API Key
        </Button>
      </div>

      {keys.length === 0 ? (
        <p className="text-sm text-text-muted">No hay API keys activas</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded-md bg-bg-card px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-text-primary">{key.label}</p>
                <div className="flex gap-3 text-xs text-text-muted">
                  <span className="font-mono">{key.keyPrefix}..</span>
                  <span>Creada: {formatDate(key.createdAt)}</span>
                  <span>Ultimo uso: {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Nunca'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {keys.length === 1 && (
                  <span className="text-xs text-status-screening">Unica key activa</span>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleRevoke(key.id)}
                  disabled={keys.length === 1}
                >
                  Revocar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createModalOpen} onClose={handleCloseCreateModal} title="Nueva API Key" size="sm">
        {rawKey ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-status-rejected">
              Guarda esta key ahora. No podras verla de nuevo.
            </p>
            <div className="rounded-md bg-bg-primary p-3">
              <code className="block break-all text-sm text-text-primary">{rawKey}</code>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                {copied ? 'Copiada!' : 'Copiar'}
              </Button>
              <Button size="sm" onClick={handleCloseCreateModal}>
                Entendido, ya la guarde
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Label"
              placeholder="Mi key de desarrollo"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCloseCreateModal}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} loading={isCreating}>
                Crear
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
