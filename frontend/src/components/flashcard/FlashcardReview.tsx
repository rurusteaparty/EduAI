'use client'
import { useState, useCallback } from 'react'
import { RotateCcw, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { flashcardsApi } from '@/lib/api'
import type { Flashcard } from '@/types'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const SM2_LABELS = [
  { quality: 0, label: 'Blackout',  icon: XCircle,     color: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  { quality: 2, label: 'Hard',      icon: AlertCircle, color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  { quality: 3, label: 'Medium',    icon: AlertCircle, color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { quality: 5, label: 'Easy',      icon: CheckCircle, color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' },
]

interface FlashcardReviewProps {
  cards: Flashcard[]
  deckId: number
  onComplete: (results: ReviewResult[]) => void
}

interface ReviewResult {
  cardId: number
  quality: number
  front: string
}

export default function FlashcardReview({ cards, deckId, onComplete }: FlashcardReviewProps) {
  const [index, setIndex]       = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [hintShown, setHint]    = useState(false)
  const [results, setResults]   = useState<ReviewResult[]>([])
  const [submitting, setSubmit] = useState(false)
  const [done, setDone]         = useState(false)

  const card = cards[index]
  const progress = index / cards.length

  const handleQuality = useCallback(async (quality: number) => {
    if (!card || submitting) return
    setSubmit(true)
    try {
      await flashcardsApi.reviewCard(card.id, quality)
      const newResults = [...results, { cardId: card.id, quality, front: card.front }]
      setResults(newResults)

      if (index + 1 >= cards.length) {
        setDone(true)
        onComplete(newResults)
      } else {
        setIndex(i => i + 1)
        setFlipped(false)
        setHint(false)
      }
    } catch { toast.error('Failed to save review') }
    finally { setSubmit(false) }
  }, [card, submitting, results, index, cards.length, onComplete])

  if (!card) return null

  if (done) {
    const correct = results.filter(r => r.quality >= 3).length
    const pct = Math.round((correct / results.length) * 100)
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session Complete!</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">You reviewed {results.length} cards</p>
        </div>
        <div className="flex gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-green-500">{correct}</p>
            <p className="text-sm text-gray-500">Remembered</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{pct}%</p>
            <p className="text-sm text-gray-500">Retention</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-500">{results.length - correct}</p>
            <p className="text-sm text-gray-500">Missed</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-100 dark:bg-dark-border rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* Card with flip animation */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: '1000px', height: '280px' }}
        onClick={() => !flipped && setFlipped(true)}
      >
        <div className={clsx(
          'relative w-full h-full transition-transform duration-500',
          flipped && '[transform:rotateY(180deg)]'
        )} style={{ transformStyle: 'preserve-3d' }}>
          {/* Front */}
          <div className="absolute inset-0 card flex flex-col items-center justify-center p-8 text-center backface-hidden">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-4">Question</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
              {card.front}
            </p>
            {card.hint && !hintShown && (
              <button
                onClick={e => { e.stopPropagation(); setHint(true) }}
                className="mt-6 text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> Show hint
              </button>
            )}
            {hintShown && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 italic border-t border-dashed border-gray-200 dark:border-dark-border pt-3 w-full">
                💡 {card.hint}
              </p>
            )}
            {!flipped && (
              <p className="absolute bottom-4 text-xs text-gray-300 dark:text-gray-600">Click to reveal answer</p>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 card flex flex-col items-center justify-center p-8 text-center bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs text-brand-500 uppercase tracking-wider font-medium mb-4">Answer</p>
            <p className="text-base text-gray-800 dark:text-gray-100 leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Style note */}
      <style jsx>{`
        .backface-hidden { backface-visibility: hidden; }
      `}</style>

      {/* Rating buttons — only show after flip */}
      {flipped && (
        <div className="animate-slide-up">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">
            How well did you remember?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SM2_LABELS.map(({ quality, label, icon: Icon, color }) => (
              <button
                key={quality}
                onClick={() => handleQuality(quality)}
                disabled={submitting}
                className={clsx(
                  'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 font-medium text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50',
                  color
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation (skip / back) */}
      <div className="flex justify-between text-xs text-gray-400">
        <button
          onClick={() => { if (index > 0) { setIndex(i => i-1); setFlipped(false); setHint(false) } }}
          disabled={index === 0}
          className="flex items-center gap-1 hover:text-gray-600 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" /> Previous
        </button>
        <button
          onClick={() => handleQuality(2)}
          className="flex items-center gap-1 hover:text-gray-600 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Skip
        </button>
      </div>
    </div>
  )
}
