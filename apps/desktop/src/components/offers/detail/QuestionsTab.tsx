import { useEffect, useState, useMemo } from 'react'
import { useApi } from '@/lib/api'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TabNav } from '@/components/ui/TabNav'
import {
	ChevronDown, ChevronRight, Eye, EyeOff, Shuffle,
	ChevronLeft, ArrowRight,
} from 'lucide-react'
import type { InterviewQuestion, CreateQuestionInput } from '@/types/api'

const DEFAULT_CATEGORIES = [
	{ value: 'technical', label: 'Tecnica' },
	{ value: 'behavioral', label: 'Behavioral' },
	{ value: 'system-design', label: 'System Design' },
]

const difficultyOptions = [
	{ value: 'easy', label: 'Facil' },
	{ value: 'medium', label: 'Media' },
	{ value: 'hard', label: 'Dificil' },
]

const difficultyColors: Record<string, string> = {
	easy: 'bg-status-accepted/20 text-status-accepted',
	medium: 'bg-status-screening/20 text-status-screening',
	hard: 'bg-status-rejected/20 text-status-rejected',
}

const difficultyLabels: Record<string, string> = {
	easy: 'Facil',
	medium: 'Media',
	hard: 'Dificil',
}

type ViewMode = 'list' | 'practice'

interface QuestionsTabProps {
	offerId: string
}

// ── Question Card (list view) ──────────────────────────────────

const QuestionCard = ({
	q,
	offerId,
	categoryOptions,
	onCreateCategory,
	onUpdate,
	onDelete,
}: {
	q: InterviewQuestion
	offerId: string
	categoryOptions: { value: string; label: string }[]
	onCreateCategory: (opt: { value: string; label: string }) => void
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

	const hasAnswer = !!q.myAnswer?.trim()

	return (
		<div className="rounded-md border border-border bg-bg-card">
			<button
				onClick={() => setExpanded(!expanded)}
				className="flex w-full items-center justify-between px-3 py-2.5 text-left"
			>
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<span className="flex-shrink-0 text-text-muted">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
					<span className="truncate text-sm text-text-primary">{q.question}</span>
				</div>
				<div className="flex flex-shrink-0 items-center gap-2 pl-2">
					{!hasAnswer && (
						<span className="rounded bg-status-screening/15 px-1.5 py-0.5 text-xs text-status-screening">
							Sin respuesta
						</span>
					)}
					{q.difficulty && (
						<span className={`rounded px-1.5 py-0.5 text-xs ${difficultyColors[q.difficulty] || 'bg-bg-hover text-text-muted'}`}>
							{difficultyLabels[q.difficulty] || q.difficulty}
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
							placeholder="Sin dificultad"
							value={editDifficulty}
							onChange={(e) => setEditDifficulty(e.target.value)}
						/>
						<Select
							label="Categoria"
							options={categoryOptions}
							placeholder="Sin categoria"
							value={editCategory}
							onChange={(e) => setEditCategory(e.target.value)}
							creatable
							onCreateOption={onCreateCategory}
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

// ── Practice Mode ──────────────────────────────────────────────

const PracticeView = ({
	questions,
	categoryFilter,
	difficultyFilter,
}: {
	questions: InterviewQuestion[]
	categoryFilter: string
	difficultyFilter: string
}) => {
	const [index, setIndex] = useState(0)
	const [showAnswer, setShowAnswer] = useState(false)
	const [shuffleOrder, setShuffleOrder] = useState<number[] | null>(null)

	const filtered = useMemo(() => {
		let list = questions
		if (categoryFilter) list = list.filter((q) => q.category === categoryFilter)
		if (difficultyFilter) list = list.filter((q) => q.difficulty === difficultyFilter)
		return list
	}, [questions, categoryFilter, difficultyFilter])

	const deck = useMemo(() => {
		if (!shuffleOrder) return filtered
		return shuffleOrder
			.filter((i) => i < filtered.length)
			.map((i) => filtered[i])
	}, [filtered, shuffleOrder])

	const current = deck[index]
	const total = deck.length

	const goTo = (i: number) => {
		setIndex(i)
		setShowAnswer(false)
	}

	const handleShuffle = () => {
		if (shuffleOrder) {
			setShuffleOrder(null)
		} else {
			const indices = Array.from({ length: filtered.length }, (_, i) => i)
			for (let i = indices.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))
				;[indices[i], indices[j]] = [indices[j], indices[i]]
			}
			setShuffleOrder(indices)
		}
		setIndex(0)
		setShowAnswer(false)
	}

	if (total === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<p className="text-sm text-text-muted">No hay preguntas que coincidan con los filtros</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col items-center gap-6 py-4">
			{/* Controls */}
			<div className="flex items-center gap-3">
				<Button
					size="sm"
					variant="ghost"
					onClick={() => goTo((index - 1 + total) % total)}
				>
					<ChevronLeft size={16} />
				</Button>
				<span className="text-sm text-text-secondary">
					{index + 1} / {total}
				</span>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => goTo((index + 1) % total)}
				>
					<ArrowRight size={16} />
				</Button>
				<Button
					size="sm"
					variant={shuffleOrder ? 'secondary' : 'ghost'}
					onClick={handleShuffle}
					title="Mezclar"
				>
					<Shuffle size={14} />
				</Button>
			</div>

			{/* Flashcard */}
			<div className="w-full max-w-xl">
				<div className="rounded-lg border border-border bg-bg-card p-6">
					{/* Question */}
					<div className="mb-4">
						<div className="mb-2 flex items-center gap-2">
							{current.difficulty && (
								<span className={`rounded px-1.5 py-0.5 text-xs ${difficultyColors[current.difficulty] || 'bg-bg-hover text-text-muted'}`}>
									{difficultyLabels[current.difficulty] || current.difficulty}
								</span>
							)}
							{current.category && (
								<span className="rounded bg-bg-hover px-1.5 py-0.5 text-xs text-text-muted">
									{current.category}
								</span>
							)}
						</div>
						<p className="text-base font-medium text-text-primary">{current.question}</p>
					</div>

					{/* Answer toggle */}
					<div className="border-t border-border pt-4">
						<button
							onClick={() => setShowAnswer((s) => !s)}
							className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
						>
							{showAnswer ? <EyeOff size={14} /> : <Eye size={14} />}
							{showAnswer ? 'Ocultar respuesta' : 'Mostrar respuesta'}
						</button>
						{showAnswer && (
							<div className="mt-3">
								{current.myAnswer?.trim() ? (
									<p className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
										{current.myAnswer}
									</p>
								) : (
									<p className="text-sm italic text-text-muted">No hay respuesta registrada</p>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Dot indicators */}
			{total <= 20 && (
				<div className="flex gap-1.5">
					{deck.map((_, i) => (
						<button
							key={i}
							onClick={() => goTo(i)}
							className={`h-2 w-2 rounded-full transition-colors ${i === index ? 'bg-text-primary' : 'bg-border hover:bg-text-muted'}`}
						/>
					))}
				</div>
			)}
		</div>
	)
}

// ── Main Tab ───────────────────────────────────────────────────

export const QuestionsTab = ({ offerId }: QuestionsTabProps) => {
	const api = useApi()
	const [questions, setQuestions] = useState<InterviewQuestion[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [newQ, setNewQ] = useState<CreateQuestionInput>({ question: '' })
	const [viewMode, setViewMode] = useState<ViewMode>('list')
	const [categoryFilter, setCategoryFilter] = useState('')
	const [difficultyFilter, setDifficultyFilter] = useState('')
	const [customCategories, setCustomCategories] = useState<{ value: string; label: string }[]>([])

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

	// Build category options from defaults + existing questions + custom (unsaved) categories
	const categoryOptions = useMemo(() => {
		const all = new Map(DEFAULT_CATEGORIES.map((c) => [c.value, c]))
		for (const q of questions) {
			if (q.category && !all.has(q.category)) {
				all.set(q.category, { value: q.category, label: q.category })
			}
		}
		for (const c of customCategories) {
			if (!all.has(c.value)) all.set(c.value, c)
		}
		return [...all.values()]
	}, [questions, customCategories])

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

	const addCustomCategory = (opt: { value: string; label: string }) => {
		setCustomCategories((prev) => prev.some((c) => c.value === opt.value) ? prev : [...prev, opt])
	}

	// Filtered questions for list view
	const filteredQuestions = useMemo(() => {
		let list = questions
		if (categoryFilter) list = list.filter((q) => q.category === categoryFilter)
		if (difficultyFilter) list = list.filter((q) => q.difficulty === difficultyFilter)
		return list
	}, [questions, categoryFilter, difficultyFilter])

	if (isLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner />
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header: view toggle + filters */}
			<div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
				<TabNav
					tabs={[
						{ key: 'list', label: 'Lista' },
						{ key: 'practice', label: 'Practicar' },
					]}
					activeKey={viewMode}
					onChange={(k) => setViewMode(k as ViewMode)}
				/>
				<div className="ml-auto flex items-center gap-2">
					<div className="w-36">
						<Select
							options={categoryOptions}
							placeholder="Categoria"
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
						/>
					</div>
					<div className="w-32">
						<Select
							options={difficultyOptions}
							placeholder="Dificultad"
							value={difficultyFilter}
							onChange={(e) => setDifficultyFilter(e.target.value)}
						/>
					</div>
				</div>
			</div>

			{/* Stats bar */}
			{questions.length > 0 && (
				<div className="flex items-center gap-4 border-b border-border px-4 py-2">
					<span className="text-xs text-text-muted">
						{filteredQuestions.length} pregunta{filteredQuestions.length !== 1 ? 's' : ''}
					</span>
					<span className="text-xs text-text-muted">
						{filteredQuestions.filter((q) => q.myAnswer?.trim()).length} con respuesta
					</span>
					<span className="text-xs text-text-muted">
						{filteredQuestions.filter((q) => !q.myAnswer?.trim()).length} sin respuesta
					</span>
				</div>
			)}

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{viewMode === 'practice' ? (
					<PracticeView
						questions={questions}
						categoryFilter={categoryFilter}
						difficultyFilter={difficultyFilter}
					/>
				) : (
					<div className="space-y-4 p-4">
						{filteredQuestions.length > 0 ? (
							<div className="space-y-2">
								{filteredQuestions.map((q) => (
									<QuestionCard
										key={q.id}
										q={q}
										offerId={offerId}
										categoryOptions={categoryOptions}
										onCreateCategory={addCustomCategory}
										onUpdate={loadQuestions}
										onDelete={loadQuestions}
									/>
								))}
							</div>
						) : questions.length > 0 ? (
							<p className="text-sm text-text-muted">No hay preguntas que coincidan con los filtros</p>
						) : (
							<p className="text-sm text-text-muted">No hay preguntas registradas</p>
						)}

						{/* New question form */}
						<div className="border-t border-border pt-4">
							<p className="mb-2 text-xs font-medium text-text-secondary">Nueva pregunta</p>
							<div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
								<Textarea
									placeholder="¿Cual fue la pregunta?"
									value={newQ.question}
									onChange={(e) => setNewQ((p) => ({ ...p, question: e.target.value }))}
									rows={2}
								/>
								<Textarea
									placeholder="Tu respuesta (opcional)"
									value={newQ.myAnswer || ''}
									onChange={(e) => setNewQ((p) => ({ ...p, myAnswer: e.target.value || undefined }))}
									rows={3}
								/>
								<div className="grid grid-cols-2 gap-2">
									<Select
										options={difficultyOptions}
										placeholder="Dificultad (opcional)"
										value={newQ.difficulty || ''}
										onChange={(e) => setNewQ((p) => ({ ...p, difficulty: e.target.value || undefined }))}
									/>
									<Select
										options={categoryOptions}
										placeholder="Categoria (opcional)"
										value={newQ.category || ''}
										onChange={(e) => setNewQ((p) => ({ ...p, category: e.target.value || undefined }))}
										creatable
										onCreateOption={addCustomCategory}
									/>
								</div>
								<Button size="sm" onClick={handleCreate} loading={isSaving}>
									Agregar pregunta
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
