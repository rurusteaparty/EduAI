'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Send, Plus, FlaskConical, Palette, Zap,
  ChevronDown, Loader2, AlertTriangle
} from 'lucide-react'
import { chatApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { useScrollBottom } from '@/hooks'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge'
import type { ChatSession, ChatMessage, SubjectMode, DifficultyLevel } from '@/types'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const STARTER_PROMPTS = {
  science: [
    'Explain Newton\'s laws with examples',
    'How does DNA replication work?',
    'Solve: ∫x²dx step by step',
    'What is quantum entanglement?',
  ],
  arts: [
    'Analyze the themes in Hamlet',
    'Explain the causes of World War I',
    'What is Kant\'s categorical imperative?',
    'Help me outline an essay on climate policy',
  ],
  general: [
    'Explain a concept I\'m struggling with',
    'Quiz me on today\'s topic',
    'Summarize my uploaded document',
    'Create practice questions for me',
  ],
}

interface ChatInterfaceProps {
  documents?: Array<{ id: number; original_filename: string }>
}

export default function ChatInterface({ documents = [] }: ChatInterfaceProps) {
  const { user } = useAuthStore()
  const [sessions, setSessions]     = useState<ChatSession[]>([])
  const [activeSession, setActive]  = useState<ChatSession | null>(null)
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [sessionLoading, setSLoad]  = useState(false)
  const [docId, setDocId]           = useState<number | undefined>()
  const [mode, setMode]             = useState<SubjectMode>(user?.subject_mode || 'general')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(user?.difficulty_level || 'beginner')
  const textareaRef                 = useRef<HTMLTextAreaElement>(null)
  const scrollRef                   = useScrollBottom(messages)

  // Load sessions
  useEffect(() => {
    chatApi.getSessions().then(r => setSessions(r.data)).catch(() => {})
  }, [])

  const createSession = useCallback(async () => {
    setSLoad(true)
    try {
      const r = await chatApi.createSession({ subject_mode: mode, difficulty_level: difficulty, document_id: docId })
      const session = r.data
      setSessions(prev => [session, ...prev])
      setActive(session)
      setMessages([])
    } catch { toast.error('Failed to create session') }
    finally { setSLoad(false) }
  }, [mode, difficulty, docId])

  const loadSession = useCallback(async (session: ChatSession) => {
    setActive(session)
    setMode(session.subject_mode)
    setDifficulty(session.difficulty_level)
    try {
      const r = await chatApi.getMessages(session.id)
      setMessages(r.data)
    } catch { toast.error('Failed to load messages') }
  }, [])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return

    let session = activeSession
    if (!session) {
      try {
        const r = await chatApi.createSession({ subject_mode: mode, difficulty_level: difficulty, document_id: docId })
        session = r.data
        setSessions(prev => [session!, ...prev])
        setActive(session)
      } catch { toast.error('Failed to start chat'); return }
    }

    // Optimistic user message
    const tempMsg: ChatMessage = {
      id: Date.now(),
      session_id: session.id,
      role: 'user',
      content,
      hallucination_flag: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    setInput('')
    setLoading(true)

    // Auto-resize textarea
    if (textareaRef.current) textareaRef.current.style.height = '44px'

    try {
      const r = await chatApi.sendMessage({ session_id: session.id, content })
      setMessages(prev => [...prev, r.data.message])
    } catch {
      toast.error('Failed to get response')
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeSession, mode, difficulty, docId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '44px'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const starters = STARTER_PROMPTS[mode] || STARTER_PROMPTS.general

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* ── Session list ──────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2 hidden xl:flex">
        <button onClick={createSession} disabled={sessionLoading} className="btn-primary btn-sm w-full">
          {sessionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New Chat
        </button>

        <div className="card flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">No chats yet</p>
          )}
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSession(s)}
              className={clsx(
                'w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors truncate',
                activeSession?.id === s.id
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                  : 'hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-gray-400'
              )}
            >
              {s.title || 'Untitled chat'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main chat area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Config bar */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-dark-border flex-wrap">
          {/* Mode selector */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border text-xs">
            {(['science', 'arts', 'general'] as SubjectMode[]).map(m => {
              const MIcon = m === 'science' ? FlaskConical : m === 'arts' ? Palette : Zap
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors capitalize',
                    mode === m
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border'
                  )}
                >
                  <MIcon className="w-3 h-3" />
                  {m}
                </button>
              )
            })}
          </div>

          {/* Difficulty */}
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
            className="text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {/* Document attach */}
          {documents.length > 0 && (
            <select
              value={docId || ''}
              onChange={e => setDocId(e.target.value ? Number(e.target.value) : undefined)}
              className="text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[180px] truncate"
            >
              <option value="">No document</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.original_filename}</option>
              ))}
            </select>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">EduAI Tutor</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  {mode === 'science' ? 'Science & STEM' : mode === 'arts' ? 'Arts & Humanities' : 'All subjects'} · {difficulty}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {starters.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs p-3 rounded-xl border border-gray-200 dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/10 text-gray-600 dark:text-gray-400 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className={clsx(
              'flex animate-slide-up',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={clsx(
                'max-w-[75%] group',
                msg.role === 'user' ? 'flex flex-col items-end' : ''
              )}>
                <div className={clsx(
                  'rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-tl-sm text-gray-800 dark:text-gray-100'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose-eduai">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {/* Hallucination badge */}
                {msg.role === 'assistant' && (
                  <ConfidenceBadge
                    score={msg.confidence_score}
                    isHallucination={msg.hallucination_flag}
                    status={msg.verification_status as any}
                    sources={msg.sources_used || []}
                  />
                )}

                <span className="text-xs text-gray-400 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-start gap-2 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="typing-indicator flex items-center gap-1 h-4">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize() }}
                onKeyDown={handleKeyDown}
                placeholder={`Ask your ${mode} question… (Shift+Enter for newline)`}
                rows={1}
                className="input resize-none pr-4 min-h-[44px] max-h-[160px] overflow-y-auto leading-6"
                style={{ height: '44px' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="btn-primary btn-md w-11 h-11 rounded-xl flex-shrink-0"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
            EduAI can make mistakes. Confidence score shown after each response.
          </p>
        </div>
      </div>
    </div>
  )
}
