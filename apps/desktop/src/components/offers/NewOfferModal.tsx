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

const levelOptions = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'architect', label: 'Architect' },
]

const typeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'part-time', label: 'Part-time' },
]

const modalityOptions = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const currencyOptions = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'ARS', label: 'ARS' },
  { value: 'MXN', label: 'MXN' },
]

const periodOptions = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'annual', label: 'Anual' },
  { value: 'hourly', label: 'Por hora' },
]

const platformOptions = [
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Indeed', label: 'Indeed' },
  { value: 'OCC', label: 'OCC' },
  { value: 'Computrabajo', label: 'Computrabajo' },
  { value: 'referral', label: 'Referido' },
  { value: 'company-site', label: 'Web empresa' },
  { value: 'other', label: 'Otro' },
]

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
  const createOffer = useOffersStore((s) => s.createOffer)
  const updateOffer = useOffersStore((s) => s.updateOffer)
  const activeWorkspaceId = useOffersStore((s) => s.activeWorkspaceId)
  const stages = usePipelineStore((s) => s.stages)
  const workspaces = usePipelineStore((s) => s.workspaces)
  const fetchWorkspaces = usePipelineStore((s) => s.fetchWorkspaces)

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

  const currentWorkspaceId = watch('workspaceId')

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

  const workspaceOptions = workspaces.map((w) => ({ value: w.id, label: w.name }))

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
            // Technologies linking failed silently — offer was created successfully
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
            options={levelOptions}
            placeholder="Seleccionar"
            {...register('level')}
          />
          <Select
            label="Tipo"
            options={typeOptions}
            placeholder="Seleccionar"
            {...register('type')}
          />
          <Select
            label="Modalidad"
            options={modalityOptions}
            placeholder="Seleccionar"
            {...register('modality')}
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
            options={currencyOptions}
            {...register('salaryCurrency')}
          />
          <Select
            label="Periodo"
            options={periodOptions}
            {...register('salaryPeriod')}
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
            options={platformOptions}
            placeholder="Seleccionar"
            {...register('sourcePlatform')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Etapa"
            options={stageOptions}
            placeholder="Sin etapa"
            {...register('currentStageId')}
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
                  &times;
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={currentWorkspaceId || ''}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setCreatingWorkspace(true)
                    } else {
                      setValue('workspaceId', e.target.value)
                    }
                  }}
                  className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-text-secondary"
                >
                  <option value="">Sin workspace</option>
                  {workspaceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  <option value="__new__">+ Nuevo workspace</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <Select
          label="CV Enviado"
          options={cvOptions.map((cv) => ({ value: cv.id, label: cv.label }))}
          placeholder="Sin CV"
          {...register('cvSnapshotId')}
        />

        <Textarea
          label="Notas"
          placeholder="Notas adicionales..."
          {...register('notes')}
        />

        {technologies.length > 0 && (
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Tecnologias</label>
            <div className="flex flex-wrap gap-1.5">
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
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

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
