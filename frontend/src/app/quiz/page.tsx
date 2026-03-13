'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout    from '@/components/layout/AppLayout'
import QuizEngine   from '@/components/quiz/QuizEngine'
import { quizApi, documentsApi } from '@/lib/api'
import type { Quiz, QuizAttempt } from '@/types'
import {
  Plus, Trophy, Play, Loader2, Brain,
  CheckCircle, Clock, Target, List
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store'

type View = 'list' | 'create' | 'quiz' | 'result'

export default function QuizPage() {
  const { user } = useAuthStore()
  const [view, setView]         = useState<View>('list')
  const [quizzes, setQuizzes]   = useState<Quiz[]>([])
  const [activeQuiz, setAQ]     = useState<Quiz | null>(null)
  const [lastAttempt, setLA]    = useState<QuizAttempt | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGen]    = useState(false)
  const [documents, setDocs]    = useState<any[]>([])

  const [form, setForm] = useState({
    title: '', topic: '', subject_mode: user?.subject_mode || 'general',
    difficulty_level: user?.difficulty_level || 'beginner',
    document_id: '', question_count: 10,
    time_limit_minutes: '', question_types: ['mcq'],
  })

  const loadQuizzes = useCallback(async () => {
    try {
      const r = await quizApi.getAll()
      setQuizzes(r.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadQuizzes()
    documentsApi.getAll().then(r => setDocs(r.data.filter((d: any) => d.status === 'indexed'))).catch(() => {})
  }, [loadQuizzes])

  const generate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGen(true)
    try {
      const r = await quizApi.generate({
        ...form,
        question_count: Number(form.question_count),
        time_limit_minutes: form.time_limit_minutes ? Number(form.time_limit_minutes) : undefined,
        document_id: form.document_id ? Number(form.document_id) : undefined,
      })
      setAQ(r.data)
      setView('quiz')
      toast.success('Quiz generated! Good luck!')
    } catch { toast.error('Failed to generate quiz') }
    finally { setGen(false) }
  }

  const startQuiz = async (quiz: Quiz) => {
    try {
      const r = await quizApi.getOne(quiz.id)
      setAQ(r.data)
      setView('quiz')
    } catch { toast.error('Failed to load quiz') }
  }

  const toggleType = (type: string) => {
    setForm(f => ({
      ...f,
      question_types: f.question_types.includes(type)
        ? f.question_types.filter(t => t !== type)
        : [...f.question_types, type]
    }))
  }

  // ── Quiz engine view ──────────────────────────────────────────
  if (view === 'quiz' && activeQuiz) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setView('list'); setAQ(null) }} className="btn-ghost btn-sm">← Exit</button>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{activeQuiz.title}</h2>
              <p className="text-xs text-gray-500">
                {activeQuiz.question_count} questions · {activeQuiz.difficulty_level} · {activeQuiz.subject_mode}
              </p>
            </div>
          </div>
          <QuizEngine
            quiz={activeQuiz}
            onComplete={attempt => {
              setLastAttempt(attempt)
              loadQuizzes()
            }}
          />
        </div>
      </AppLayout>
    )
  }

  // ── Create form ───────────────────────────────────────────────
  if (view === 'create') {
    const TYPES = [
      { id: 'mcq',          label: 'Multiple Choice' },
      { id: 'true_false',   label: 'True / False'    },
      { id: 'short_answer', label: 'Short Answer'    },
    ]
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('list')} className="btn-ghost btn-sm">← Back</button>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Generate Quiz</h2>
          </div>
          <div className="card p-6">
            <form onSubmit={generate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quiz Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="input" placeholder="e.g. Thermodynamics Midterm Practice" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Topic</label>
                <input value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))}
                  className="input" placeholder="e.g. Ideal gas law, Shakespeare themes..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject</label>
                  <select value={form.subject_mode} onChange={e => setForm(f => ({...f, subject_mode: e.target.value}))} className="input">
                    <option value="general">General</option>
                    <option value="science">Science</option>
                    <option value="arts">Arts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Difficulty</label>
                  <select value={form.difficulty_level} onChange={e => setForm(f => ({...f, difficulty_level: e.target.value}))} className="input">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Questions: {form.question_count}</label>
                  <input type="range" min={3} max={30} step={1} value={form.question_count}
                    onChange={e => setForm(f => ({...f, question_count: Number(e.target.value)}))}
                    className="w-full accent-brand-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Time Limit (min)</label>
                  <input type="number" value={form.time_limit_minutes} min={1} max={180}
                    onChange={e => setForm(f => ({...f, time_limit_minutes: e.target.value}))}
                    className="input" placeholder="No limit" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Types</label>
                <div className="flex gap-2 flex-wrap">
                  {TYPES.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => toggleType(t.id)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        form.question_types.includes(t.id)
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-brand-300'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {documents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From Document</label>
                  <select value={form.document_id} onChange={e => setForm(f => ({...f, document_id: e.target.value}))} className="input">
                    <option value="">AI general knowledge</option>
                    {documents.map(d => <option key={d.id} value={d.id}>{d.original_filename}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" disabled={generating} className="btn-primary btn-md w-full">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Generate Quiz
              </button>
            </form>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Quiz list ─────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quiz Center</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-generated adaptive quizzes</p>
          </div>
          <button onClick={() => setView('create')} className="btn-primary btn-md">
            <Plus className="w-4 h-4" /> New Quiz
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="shimmer h-44 rounded-2xl" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card p-16 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-white">No quizzes yet</h3>
            <p className="text-sm text-gray-500 mt-1">Generate your first AI quiz to test your knowledge</p>
            <button onClick={() => setView('create')} className="btn-primary btn-md mt-4">
              <Plus className="w-4 h-4" /> Generate Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="card card-hover p-5 flex flex-col gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{quiz.title}</h3>
                    <span className={clsx('badge flex-shrink-0', `badge-${quiz.difficulty_level}`)}>
                      {quiz.difficulty_level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {quiz.subject_mode} · {quiz.question_count} questions
                    {quiz.time_limit_minutes && ` · ${quiz.time_limit_minutes}min`}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => startQuiz(quiz)} className="btn-primary btn-sm flex-1">
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
                  <button className="btn-ghost btn-sm px-2" title="View history">
                    <List className="w-3.5 h-3.5" />
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
