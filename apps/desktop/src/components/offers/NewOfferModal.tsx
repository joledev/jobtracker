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
import type { CreateOfferInput, OfferDetail } from '@/types/api'

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
  { value: 'referral', label: 'Referido' },
  { value: 'company-site', label: 'Web empresa' },
  { value: 'other', label: 'Otro' },
]

interface NewOfferModalProps {
  open: boolean
  onClose: () => void
  offer?: OfferDetail | null
  onUpdated?: () => void
}

export const NewOfferModal = ({ open, onClose, offer, onUpdated }: NewOfferModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createOffer = useOffersStore((s) => s.createOffer)
  const updateOffer = useOffersStore((s) => s.updateOffer)
  const activeWorkspaceId = useOffersStore((s) => s.activeWorkspaceId)
  const stages = usePipelineStore((s) => s.stages)
  const workspaces = usePipelineStore((s) => s.workspaces)

  const isEditMode = !!offer

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salaryCurrency: 'USD',
      salaryPeriod: 'monthly',
      workspaceId: activeWorkspaceId || undefined,
    },
  })

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
        notes: offer.notes || '',
      })
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
        notes: '',
      })
    }
  }, [offer, open, reset, activeWorkspaceId])

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
      if (data.notes) input.notes = data.notes

      if (isEditMode) {
        await updateOffer(offer.id, input)
        onUpdated?.()
      } else {
        await createOffer(input)
      }
      reset()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
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
          <Select
            label="Workspace"
            options={workspaceOptions}
            placeholder="Sin workspace"
            {...register('workspaceId')}
          />
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
