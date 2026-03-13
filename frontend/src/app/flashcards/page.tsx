'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout        from '@/components/layout/AppLayout'
import FlashcardReview  from '@/components/flashcard/FlashcardReview'
import { flashcardsApi, documentsApi } from '@/lib/api'
import type { FlashcardDeck, Flashcard } from '@/types'
import {
  Plus, BookOpen, Play, Loader2, Brain,
  CheckCircle, Clock, BarChart2, Trash2
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store'

type View = 'list' | 'create' | 'review'

export default function FlashcardsPage() {
  const { user }   = useAuthStore()
  const [view, setView]       = useState<View>('list')
  const [decks, setDecks]     = useState<FlashcardDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating]  = useState(false)
  const [reviewDeck, setRDeck]   = useState<FlashcardDeck | null>(null)
  const [dueCards, setDueCards]  = useState<Flashcard[]>([])
  const [documents, setDocs]     = useState<any[]>([])

  const [form, setForm] = useState({
    title: '', topic: '', subject_mode: user?.subject_mode || 'general',
    difficulty_level: user?.difficulty_level || 'beginner',
    document_id: '', card_count: 10,
  })

  const loadDecks = useCallback(async () => {
    setLoading(true)
    try {
      const r = await flashcardsApi.getDecks()
      setDecks(r.data)
    } catch { toast.error('Failed to load decks') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadDecks()
    documentsApi.getAll().then(r => setDocs(r.data.filter((d: any) => d.status === 'indexed'))).catch(() => {})
  }, [loadDecks])

  const startReview = async (deck: FlashcardDeck) => {
    try {
      const r = await flashcardsApi.getDueCards(deck.id, 20)
      if (r.data.length === 0) { toast('No cards due for review today! Come back later 🎉'); return }
      setRDeck(deck)
      setDueCards(r.data)
      setView('review')
    } catch { toast.error('Failed to load cards') }
  }

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await flashcardsApi.createDeck({
        ...form,
        document_id: form.document_id ? Number(form.document_id) : undefined,
        card_count: Number(form.card_count),
      })
      toast.success('Deck created! AI is generating cards...')
      setView('list')
      setTimeout(loadDecks, 2000)
    } catch { toast.error('Failed to create deck') }
    finally { setCreating(false) }
  }

  // ── Review screen ─────────────────────────────────────────────
  if (view === 'review' && reviewDeck) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setView('list'); setRDeck(null) }} className="btn-ghost btn-sm">← Back</button>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{reviewDeck.title}</h2>
              <p className="text-xs text-gray-500">{dueCards.length} cards due</p>
            </div>
          </div>
          <FlashcardReview
            cards={dueCards}
            deckId={reviewDeck.id}
            onComplete={results => {
              const correct = results.filter(r => r.quality >= 3).length
              toast.success(`Session complete! ${correct}/${results.length} remembered`)
              setView('list')
              loadDecks()
            }}
          />
        </div>
      </AppLayout>
    )
  }

  // ── Create deck form ──────────────────────────────────────────
  if (view === 'create') {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('list')} className="btn-ghost btn-sm">← Back</button>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Create Flashcard Deck</h2>
          </div>
          <div className="card p-6">
            <form onSubmit={createDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Deck Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="input" placeholder="e.g. Newton's Laws of Motion" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Topic (for AI generation)</label>
                <input value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))}
                  className="input" placeholder="e.g. Classical mechanics, derivatives, World War II..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject Mode</label>
                  <select value={form.subject_mode} onChange={e => setForm(f => ({...f, subject_mode: e.target.value}))}
                    className="input">
                    <option value="general">General</option>
                    <option value="science">Science</option>
                    <option value="arts">Arts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Difficulty</label>
                  <select value={form.difficulty_level} onChange={e => setForm(f => ({...f, difficulty_level: e.target.value}))}
                    className="input">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Number of Cards: {form.card_count}
                  </label>
                  <input type="range" min={5} max={50} step={5} value={form.card_count}
                    onChange={e => setForm(f => ({...f, card_count: Number(e.target.value)}))}
                    className="w-full accent-brand-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From Document</label>
                  <select value={form.document_id} onChange={e => setForm(f => ({...f, document_id: e.target.value}))}
                    className="input">
                    <option value="">No document</option>
                    {documents.map(d => <option key={d.id} value={d.id}>{d.original_filename}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={creating} className="btn-primary btn-md w-full">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Generate Deck with AI
              </button>
            </form>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Deck list ─────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Flashcard Decks</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-generated with spaced repetition</p>
          </div>
          <button onClick={() => setView('create')} className="btn-primary btn-md">
            <Plus className="w-4 h-4" /> New Deck
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="shimmer h-44 rounded-2xl" />)}
          </div>
        ) : decks.length === 0 ? (
          <div className="card p-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-white">No decks yet</h3>
            <p className="text-sm text-gray-500 mt-1">Create your first AI-generated flashcard deck</p>
            <button onClick={() => setView('create')} className="btn-primary btn-md mt-4">
              <Plus className="w-4 h-4" /> Create Deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => (
              <div key={deck.id} className="card card-hover p-5 flex flex-col gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{deck.title}</h3>
                    <span className={clsx('badge flex-shrink-0', `badge-${deck.difficulty_level}`)}>
                      {deck.difficulty_level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {deck.subject_mode} · {deck.card_count} cards
                  </p>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button onClick={() => startReview(deck)} className="btn-primary btn-sm flex-1">
                    <Play className="w-3.5 h-3.5" /> Review
                  </button>
                  <button className="btn-ghost btn-sm px-2" title="Stats">
                    <BarChart2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
