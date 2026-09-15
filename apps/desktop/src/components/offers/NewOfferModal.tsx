import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useOffersStore } from '@/stores/offers'
import { usePipelineStore } from '@/stores/pipeline'
import { useDropdownOptionsStore } from '@/stores/dropdown-options'
import { getClient } from '@/lib/client'
import type { CreateOfferInput, OfferDetail, CvSnapshot } from '@/types/api'

const formSchema = z.object({
  company: z.string().min(1, 'Empresa es requerida'),
  position: z.string().min(1, 'Posicion es requerida'),
  level: z.string().optional(),
  type: z.string().optional(),
  modality: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  salaryCurrency: z.string().optional(),
  salaryPeriod: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourcePlatform: z.string().optional(),
  currentStageId: z.string().optional(),
  workspaceId: z.string().optional(),
  cvSnapshotId: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface NewOfferModalProps {
  open: boolean
  onClose: () => void
  offer?: OfferDetail | null
  onUpdated?: () => void
  prefill?: Record<string, string> | null
  prefillTechnologies?: string[]
}

export const NewOfferModal = ({ open, onClose, offer, onUpdated, prefill, prefillTechnologies }: NewOfferModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cvOptions, setCvOptions] = useState<CvSnapshot[]>([])
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [isCreatingWs, setIsCreatingWs] = useState(false)
  const [technologies, setTechnologies] = useState<string[]>([])
  const [techInput, setTechInput] = useState('')
  const createOffer = useOffersStore((s) => s.createOffer)
  const updateOffer = useOffersStore((s) => s.updateOffer)
  const activeWorkspaceId = useOffersStore((s) => s.activeWorkspaceId)
  const stages = usePipelineStore((s) => s.stages)
  const workspaces = usePipelineStore((s) => s.workspaces)
  const fetchWorkspaces = usePipelineStore((s) => s.fetchWorkspaces)
  const dropdownOptions = useDropdownOptionsStore((s) => s.options)
  const addOption = useDropdownOptionsStore((s) => s.addOption)

  const isEditMode = !!offer

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salaryCurrency: 'USD',
      salaryPeriod: 'monthly',
      workspaceId: activeWorkspaceId || undefined,
    },
  })

  const watchedValues = watch()

  const setField = (name: keyof FormData) => (e: { target: { value: string } }) => {
    setValue(name, e.target.value)
  }

  const addTech = () => {
    const items = techInput.split(',').map(s => s.trim()).filter(Boolean)
    const unique = items.filter(t => !technologies.some(e => e.toLowerCase() === t.toLowerCase()))
    if (unique.length > 0) {
      setTechnologies(prev => [...prev, ...unique])
    }
    setTechInput('')
  }

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim()
    if (!name) return
    setIsCreatingWs(true)
    try {
      const client = getClient()
      if (!client) return
      const created = await client.workspaces.create({ name })
      await fetchWorkspaces()
      setValue('workspaceId', created.id)
      setCreatingWorkspace(false)
      setNewWorkspaceName('')
    } finally {
      setIsCreatingWs(false)
    }
  }

  useEffect(() => {
    if (open) {
      const client = getClient()
      if (client) {
        client.cvs.list({ type: 'cv' }).then(setCvOptions).catch(() => {})
      }
    }
  }, [open])

  useEffect(() => {
    if (offer && open) {
      reset({
        company: offer.company,
        position: offer.position,
        level: offer.level || '',
        type: offer.type || '',
        modality: offer.modality || '',
        salaryMin: offer.salaryMin?.toString() || '',
        salaryMax: offer.salaryMax?.toString() || '',
        salaryCurrency: offer.salaryCurrency || 'USD',
        salaryPeriod: offer.salaryPeriod || 'monthly',
        sourceUrl: offer.sourceUrl || '',
        sourcePlatform: offer.sourcePlatform || '',
        currentStageId: offer.currentStageId || '',
        workspaceId: offer.workspaceId || '',
        cvSnapshotId: offer.cvSnapshot?.id || '',
        notes: offer.notes || '',
      })
    } else if (prefill && open) {
      reset({
        company: prefill.company || '',
        position: prefill.position || '',
        level: prefill.level || '',
        type: prefill.type || '',
        modality: prefill.modality || '',
        salaryMin: prefill.salaryMin || '',
        salaryMax: prefill.salaryMax || '',
        salaryCurrency: prefill.salaryCurrency || 'USD',
        salaryPeriod: prefill.salaryPeriod || 'monthly',
        sourceUrl: prefill.sourceUrl || '',
        sourcePlatform: prefill.sourcePlatform || '',
        currentStageId: '',
        workspaceId: activeWorkspaceId || '',
        cvSnapshotId: '',
        notes: prefill.notes || '',
      })
      setTechnologies(prefillTechnologies || [])
    } else if (!offer && open) {
      reset({
        company: '',
        position: '',
        level: '',
        type: '',
        modality: '',
        salaryMin: '',
        salaryMax: '',
        salaryCurrency: 'USD',
        salaryPeriod: 'monthly',
        sourceUrl: '',
        sourcePlatform: '',
        currentStageId: '',
        workspaceId: activeWorkspaceId || '',
        cvSnapshotId: '',
        notes: '',
      })
      setTechnologies([])
    }
  }, [offer, prefill, prefillTechnologies, open, reset, activeWorkspaceId])

  const stageOptions = stages
    .filter((s) => !s.isTerminal)
    .map((s) => ({ value: s.id, label: s.name }))

  const workspaceSelectOptions = [
    ...workspaces.map((w) => ({ value: w.id, label: w.name })),
    { value: '__new__', label: '+ Nuevo workspace' },
  ]

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const salaryMin = data.salaryMin ? Number(data.salaryMin) : undefined
      const salaryMax = data.salaryMax ? Number(data.salaryMax) : undefined

      const input: CreateOfferInput = {
        company: data.company,
        position: data.position,
      }
      if (data.level) input.level = data.level
      if (data.type) input.type = data.type
      if (data.modality) input.modality = data.modality
      if (salaryMin && salaryMin > 0) input.salaryMin = salaryMin
      if (salaryMax && salaryMax > 0) input.salaryMax = salaryMax
      if (data.salaryCurrency) input.salaryCurrency = data.salaryCurrency
      if (data.salaryPeriod) input.salaryPeriod = data.salaryPeriod
      if (data.sourceUrl) input.sourceUrl = data.sourceUrl
      if (data.sourcePlatform) input.sourcePlatform = data.sourcePlatform
      if (data.currentStageId) input.currentStageId = data.currentStageId
      if (data.workspaceId) input.workspaceId = data.workspaceId
      if (data.cvSnapshotId) input.cvSnapshotId = data.cvSnapshotId
      if (data.notes) input.notes = data.notes

      if (isEditMode) {
        await updateOffer(offer.id, input)
        onUpdated?.()
      } else {
        const offerId = await createOffer(input)
        if (offerId && technologies.length > 0) {
          try {
            const client = getClient()
            if (client) {
              const allTechs = await client.technologies.list()
              for (const techName of technologies) {
                let tech = allTechs.find(t => t.name.toLowerCase() === techName.toLowerCase())
                if (!tech) {
                  tech = await client.technologies.create({ name: techName })
                }
                await client.offers.addTechnology(offerId, { technologyId: tech.id, context: 'required' })
              }
            }
          } catch {
            // Technologies linking failed silently -- offer was created successfully
          }
        }
      }
      reset()
      setTechnologies([])
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setTechnologies([])
    setTechInput('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={isEditMode ? 'Editar Oferta' : 'Nueva Oferta'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Empresa"
            placeholder="Google, Meta, etc."
            error={errors.company?.message}
            {...register('company')}
          />
          <Input
            label="Posicion"
            placeholder="Backend Engineer"
            error={errors.position?.message}
            {...register('position')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Nivel"
            options={dropdownOptions.levels}
            placeholder="Seleccionar"
            value={watchedValues.level || ''}
            onChange={setField('level')}
            creatable
            onCreateOption={(opt) => addOption('levels', opt)}
          />
          <Select
            label="Tipo"
            options={dropdownOptions.types}
            placeholder="Seleccionar"
            value={watchedValues.type || ''}
            onChange={setField('type')}
            creatable
            onCreateOption={(opt) => addOption('types', opt)}
          />
          <Select
            label="Modalidad"
            options={dropdownOptions.modalities}
            placeholder="Seleccionar"
            value={watchedValues.modality || ''}
            onChange={setField('modality')}
            creatable
            onCreateOption={(opt) => addOption('modalities', opt)}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Input
            label="Salario min"
            type="number"
            placeholder="0"
            {...register('salaryMin')}
          />
          <Input
            label="Salario max"
            type="number"
            placeholder="0"
            {...register('salaryMax')}
          />
          <Select
            label="Moneda"
            options={dropdownOptions.currencies}
            value={watchedValues.salaryCurrency || ''}
            onChange={setField('salaryCurrency')}
            creatable
            onCreateOption={(opt) => addOption('currencies', opt)}
          />
          <Select
            label="Periodo"
            options={dropdownOptions.periods}
            value={watchedValues.salaryPeriod || ''}
            onChange={setField('salaryPeriod')}
            creatable
            onCreateOption={(opt) => addOption('periods', opt)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="URL fuente"
            type="url"
            placeholder="https://..."
            {...register('sourceUrl')}
          />
          <Select
            label="Plataforma"
            options={dropdownOptions.platforms}
            placeholder="Seleccionar"
            value={watchedValues.sourcePlatform || ''}
            onChange={setField('sourcePlatform')}
            creatable
            onCreateOption={(opt) => addOption('platforms', opt)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Etapa"
            options={stageOptions}
            placeholder="Sin etapa"
            value={watchedValues.currentStageId || ''}
            onChange={setField('currentStageId')}
          />
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Workspace</label>
            {creatingWorkspace ? (
              <div className="flex gap-2">
                <input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Nombre del workspace"
                  className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleCreateWorkspace() }
                    if (e.key === 'Escape') { setCreatingWorkspace(false); setNewWorkspaceName('') }
                  }}
                />
                <Button type="button" size="sm" onClick={handleCreateWorkspace} loading={isCreatingWs} disabled={!newWorkspaceName.trim()}>
                  Crear
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setCreatingWorkspace(false); setNewWorkspaceName('') }}>
                  x
                </Button>
              </div>
            ) : (
              <Select
                options={workspaceSelectOptions}
                placeholder="Sin workspace"
                value={watchedValues.workspaceId || ''}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setCreatingWorkspace(true)
                  } else {
                    setValue('workspaceId', e.target.value)
                  }
                }}
              />
            )}
          </div>
        </div>

        <Select
          label="CV Enviado"
          options={cvOptions.map((cv) => ({ value: cv.id, label: cv.label }))}
          placeholder="Sin CV"
          value={watchedValues.cvSnapshotId || ''}
          onChange={setField('cvSnapshotId')}
        />

        <div>
          <label className="mb-1 block text-sm text-text-secondary">Tecnologias / Habilidades</label>
          <div className="flex gap-2">
            <input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTech()
                }
              }}
              placeholder="React, Go, AWS... (Enter para agregar)"
              className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
            />
            <Button type="button" size="sm" variant="secondary" onClick={addTech} disabled={!techInput.trim()}>
              Agregar
            </Button>
          </div>
          {technologies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1 rounded-full bg-bg-hover px-2.5 py-1 text-xs text-text-primary"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => setTechnologies(prev => prev.filter(t => t !== tech))}
                    className="ml-0.5 text-text-muted hover:text-text-primary"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Textarea
          label="Notas"
          placeholder="Notas adicionales..."
          {...register('notes')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditMode ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
