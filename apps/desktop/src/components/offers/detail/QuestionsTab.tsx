import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { InterviewQuestion, CreateQuestionInput } from '@/types/api'

const difficultyOptions = [
  { value: 'easy', label: 'Facil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Dificil' },
]

const categoryOptions = [
  { value: 'technical', label: 'Tecnica' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'system-design', label: 'System Design' },
]

const difficultyColors: Record<string, string> = {
  easy: 'bg-status-accepted/20 text-status-accepted',
  medium: 'bg-status-screening/20 text-status-screening',
  hard: 'bg-status-rejected/20 text-status-rejected',
}

interface QuestionsTabProps {
  offerId: string
}

const QuestionCard = ({
  q,
  offerId,
  onUpdate,
  onDelete,
}: {
  q: InterviewQuestion
  offerId: string
  onUpdate: () => void
  onDelete: () => void
}) => {
  const api = useApi()
  const [expanded, setExpanded] = useState(false)
  const [editQuestion, setEditQuestion] = useState(q.question)
  const [editAnswer, setEditAnswer] = useState(q.myAnswer || '')
  const [editDifficulty, setEditDifficulty] = useState(q.difficulty || '')
  const [editCategory, setEditCategory] = useState(q.category || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.offers.updateQuestion(offerId, q.id, {
        question: editQuestion,
        myAnswer: editAnswer || undefined,
        difficulty: editDifficulty || undefined,
        category: editCategory || undefined,
      })
      onUpdate()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta pregunta?')) return
    await api.offers.deleteQuestion(offerId, q.id)
    onDelete()
  }

  return (
    <div className="rounded-md border border-border bg-bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{expanded ? '▼' : '▶'}</span>
          <span className="text-sm text-text-primary">{q.question}</span>
        </div>
        <div className="flex items-center gap-2">
          {q.difficulty && (
            <span className={`rounded px-1.5 py-0.5 text-xs ${difficultyColors[q.difficulty] || 'bg-bg-hover text-text-muted'}`}>
              {q.difficulty}
            </span>
          )}
          {q.category && (
            <span className="rounded bg-bg-hover px-1.5 py-0.5 text-xs text-text-muted">
              {q.category}
            </span>
          )}
        </div>
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <Textarea
            label="Pregunta"
            value={editQuestion}
            onChange={(e) => setEditQuestion(e.target.value)}
            rows={2}
          />
          <Textarea
            label="Mi respuesta"
            value={editAnswer}
            onChange={(e) => setEditAnswer(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Dificultad"
              options={difficultyOptions}
              placeholder="Seleccionar"
              value={editDifficulty}
              onChange={(e) => setEditDifficulty(e.target.value)}
            />
            <Select
              label="Categoria"
              options={categoryOptions}
              placeholder="Seleccionar"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={isSaving}>
              Guardar cambios
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const QuestionsTab = ({ offerId }: QuestionsTabProps) => {
  const api = useApi()
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newQ, setNewQ] = useState<CreateQuestionInput>({ question: '' })

  const loadQuestions = async () => {
    setIsLoading(true)
    try {
      const data = await api.offers.listQuestions(offerId)
      setQuestions(data)
    } catch {
      setQuestions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [offerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!newQ.question.trim()) return
    setIsSaving(true)
    try {
      await api.offers.createQuestion(offerId, newQ)
      setNewQ({ question: '' })
      await loadQuestions()
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
      {questions.length > 0 ? (
        <div className="space-y-2">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              offerId={offerId}
              onUpdate={loadQuestions}
              onDelete={loadQuestions}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No hay preguntas registradas</p>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-text-secondary">Nueva pregunta</p>
        <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
          <Textarea
            placeholder="¿Cual fue la pregunta?"
            value={newQ.question}
            onChange={(e) => setNewQ((p) => ({ ...p, question: e.target.value }))}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              options={difficultyOptions}
              placeholder="Dificultad"
              value={newQ.difficulty || ''}
              onChange={(e) => setNewQ((p) => ({ ...p, difficulty: e.target.value || undefined }))}
            />
            <Select
              options={categoryOptions}
              placeholder="Categoria"
              value={newQ.category || ''}
              onChange={(e) => setNewQ((p) => ({ ...p, category: e.target.value || undefined }))}
            />
          </div>
          <Button size="sm" onClick={handleCreate} loading={isSaving}>
            Agregar pregunta
          </Button>
        </div>
      </div>
    </div>
  )
}
