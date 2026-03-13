'use client'
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, ChevronRight, Trophy, RotateCcw, Loader2 } from 'lucide-react'
import { quizApi } from '@/lib/api'
import type { Quiz, QuizQuestion, QuizAttempt, QuestionFeedback } from '@/types'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useTimer } from '@/hooks'

interface QuizEngineProps {
  quiz: Quiz
  onComplete: (attempt: QuizAttempt) => void
}

export default function QuizEngine({ quiz, onComplete }: QuizEngineProps) {
  const [answers, setAnswers]   = useState<Record<string, string>>({})
  const [current, setCurrent]   = useState(0)
  const [submitted, setSubmit]  = useState(false)
  const [attempt, setAttempt]   = useState<QuizAttempt | null>(null)
  const [loading, setLoading]   = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const timer = useTimer()

  const questions = quiz.questions || []
  const question  = questions[current]
  const total     = questions.length

  useEffect(() => { timer.start() }, [])

  const selectAnswer = (qid: number, answer: string) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [String(qid)]: answer }))
  }

  const submit = useCallback(async () => {
    if (loading) return
    const unanswered = questions.filter(q => !answers[String(q.id)]).length
    if (unanswered > 0 && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return

    timer.pause()
    setLoading(true)
    try {
      const r = await quizApi.submit({
        quiz_id: quiz.id,
        answers,
        time_taken_seconds: timer.seconds,
      })
      setAttempt(r.data)
      setSubmit(true)
      onComplete(r.data)
    } catch { toast.error('Failed to submit quiz') }
    finally { setLoading(false) }
  }, [answers, questions, quiz.id, timer, loading, onComplete])

  // ── Results screen ────────────────────────────────────────────
  if (submitted && attempt) {
    const pct     = attempt.score
    const grade   = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
    const gradeColor = pct >= 80 ? 'text-green-500' : pct >= 60 ? 'text-amber-500' : 'text-red-500'

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
        {/* Score card */}
        <div className="card p-8 text-center">
          <div className={clsx('text-7xl font-black mb-2', gradeColor)}>{grade}</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{pct.toFixed(1)}%</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {attempt.earned_points} / {attempt.total_points} points
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm">
            <div className="text-center">
              <p className="font-bold text-gray-900 dark:text-white text-xl">
                {questions.filter(q => attempt.answers?.[q.id]?.is_correct).length}
              </p>
              <p className="text-gray-500">Correct</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 dark:text-white text-xl">
                {questions.filter(q => !attempt.answers?.[q.id]?.is_correct).length}
              </p>
              <p className="text-gray-500">Wrong</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 dark:text-white text-xl">{timer.formatted}</p>
              <p className="text-gray-500">Time</p>
            </div>
          </div>
        </div>

        {/* Review toggle */}
        <button
          onClick={() => setReviewed(r => !r)}
          className="btn-secondary btn-md w-full"
        >
          {reviewed ? 'Hide' : 'Review'} Answers & Explanations
        </button>

        {/* Per-question review */}
        {reviewed && (
          <div className="space-y-4">
            {questions.map((q, i) => {
              const ans     = attempt.answers?.[String(q.id)]
              const correct = ans?.is_correct
              const fb      = attempt.feedback?.[String(q.id)] as QuestionFeedback | undefined
              return (
                <div key={q.id} className={clsx(
                  'card p-5 border-l-4',
                  correct ? 'border-l-green-500' : 'border-l-red-500'
                )}>
                  <div className="flex items-start gap-3">
                    {correct
                      ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        Q{i+1}. {q.question_text}
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className={clsx('font-medium', correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                          Your answer: {ans?.user_answer || '(no answer)'}
                        </p>
                        {!correct && (
                          <p className="text-green-600 dark:text-green-400">
                            Correct: {q.correct_answer}
                          </p>
                        )}
                        {(fb?.explanation || q.explanation) && (
                          <p className="text-gray-500 dark:text-gray-400 mt-2 p-3 bg-gray-50 dark:bg-dark-border rounded-lg text-xs leading-relaxed">
                            💡 {fb?.explanation || q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-400 flex-shrink-0">
                      {ans?.points_earned || 0}/{q.points}pts
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Active quiz ───────────────────────────────────────────────
  if (!question) return null

  const answeredCount = Object.keys(answers).length
  const progressPct   = (answeredCount / total) * 100

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="badge badge-beginner">{current + 1} / {total}</span>
          <span className="text-sm text-gray-500">{answeredCount} answered</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-gray-600 dark:text-gray-300">
          <Clock className="w-4 h-4" />
          {timer.formatted}
          {quiz.time_limit_minutes && (
            <span className="text-xs text-gray-400 ml-1">/ {quiz.time_limit_minutes}:00</span>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="w-full bg-gray-100 dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Question card */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed">
            {question.question_text}
          </p>
          <span className="badge badge-beginner flex-shrink-0">{question.points}pts</span>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {question.question_type === 'short_answer' ? (
            <textarea
              value={answers[String(question.id)] || ''}
              onChange={e => selectAnswer(question.id, e.target.value)}
              placeholder="Type your answer here..."
              rows={3}
              className="input resize-none"
            />
          ) : (
            question.options?.map((opt, i) => {
              const selected = answers[String(question.id)] === opt
              return (
                <button
                  key={i}
                  onClick={() => selectAnswer(question.id, opt)}
                  className={clsx(
                    'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all duration-150 font-medium',
                    selected
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border'
                  )}
                >
                  <span className={clsx(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2.5 font-bold',
                    selected ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-dark-border text-gray-500'
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        {/* Question dots */}
        <div className="flex gap-1.5 flex-wrap">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={clsx(
                'w-7 h-7 rounded-full text-xs font-semibold transition-all',
                i === current
                  ? 'bg-brand-600 text-white scale-110'
                  : answers[String(q.id)]
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-dark-border text-gray-500 hover:bg-gray-200'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {current < total - 1 ? (
            <button onClick={() => setCurrent(c => c + 1)} className="btn-primary btn-md">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={loading} className="btn-primary btn-md">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
