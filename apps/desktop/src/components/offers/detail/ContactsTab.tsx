import { useState, useRef, useEffect } from 'react'
import { useApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { OfferDetail, Contact, CreateContactInput } from '@/types/api'

interface ContactsTabProps {
  offer: OfferDetail
  onRefresh: () => void
}

export const ContactsTab = ({ offer, onRefresh }: ContactsTabProps) => {
  const api = useApi()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newContact, setNewContact] = useState<CreateContactInput>({ name: '' })
  const [isCreating, setIsCreating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    clearTimeout(debounceRef.current)
    if (!value) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await api.contacts.list({ search: value })
        const linkedIds = new Set(offer.contacts.map((c) => c.id))
        setSearchResults(results.filter((c) => !linkedIds.has(c.id)))
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleLink = async (contactId: string) => {
    await api.offers.addContact(offer.id, contactId)
    setSearchQuery('')
    setSearchResults([])
    onRefresh()
  }

  const handleUnlink = async (contactId: string) => {
    await api.offers.removeContact(offer.id, contactId)
    onRefresh()
  }

  const handleCreateContact = async () => {
    if (!newContact.name) return
    setIsCreating(true)
    try {
      const created = await api.contacts.create(newContact)
      await api.offers.addContact(offer.id, created.id)
      setNewContact({ name: '' })
      setShowNewForm(false)
      onRefresh()
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {offer.contacts.length > 0 ? (
        <div className="space-y-2">
          {offer.contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between rounded-md bg-bg-card p-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{contact.name}</p>
                <div className="flex gap-3 text-xs text-text-muted">
                  {contact.company && <span>{contact.company}</span>}
                  {contact.role && <span>{contact.role}</span>}
                </div>
                <div className="mt-1 flex gap-3 text-xs">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-status-applied hover:underline">
                      {contact.email}
                    </a>
                  )}
                  {contact.linkedinUrl && (
                    <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-status-applied hover:underline">
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleUnlink(contact.id)}
                className="text-text-muted transition-colors hover:text-status-rejected"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No hay contactos asociados</p>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-text-secondary">Agregar contacto</p>
        <Input
          placeholder="Buscar contacto por nombre o empresa..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {isSearching && <p className="mt-1 text-xs text-text-muted">Buscando...</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1 rounded-md border border-border bg-bg-card">
            {searchResults.map((c) => (
              <button
                key={c.id}
                onClick={() => handleLink(c.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover"
              >
                <span className="text-text-primary">{c.name}</span>
                <span className="text-xs text-text-muted">{c.company}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3">
          {showNewForm ? (
            <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
              <Input
                placeholder="Nombre *"
                value={newContact.name}
                onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Empresa"
                  value={newContact.company || ''}
                  onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))}
                />
                <Input
                  placeholder="Rol"
                  value={newContact.role || ''}
                  onChange={(e) => setNewContact((p) => ({ ...p, role: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Email"
                  type="email"
                  value={newContact.email || ''}
                  onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                />
                <Input
                  placeholder="LinkedIn URL"
                  value={newContact.linkedinUrl || ''}
                  onChange={(e) => setNewContact((p) => ({ ...p, linkedinUrl: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateContact} loading={isCreating}>
                  Crear y asociar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setShowNewForm(true)}>
              Crear nuevo contacto
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
