'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { documentsApi } from '@/lib/api'
import type { Document } from '@/types'
import {
  Upload, File, Trash2, CheckCircle, Clock,
  AlertCircle, Loader2, FileText, RefreshCw
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending:    { icon: Clock,        color: 'text-gray-400',   label: 'Pending'    },
  processing: { icon: Loader2,      color: 'text-amber-500',  label: 'Processing' },
  indexed:    { icon: CheckCircle,  color: 'text-green-500',  label: 'Ready'      },
  failed:     { icon: AlertCircle,  color: 'text-red-500',    label: 'Failed'     },
}

const ALLOWED = ['pdf', 'docx', 'txt', 'md']

export default function UploadPage() {
  const [docs, setDocs]         = useState<Document[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [mode, setMode]         = useState('general')
  const fileRef                 = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    try { const r = await documentsApi.getAll(); setDocs(r.data) }
    catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  // Poll processing docs every 3s
  useEffect(() => {
    const processing = docs.some(d => d.status === 'pending' || d.status === 'processing')
    if (!processing) return
    const id = setInterval(loadDocs, 3000)
    return () => clearInterval(id)
  }, [docs, loadDocs])

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED.includes(ext || '')) {
      toast.error(`File type .${ext} not supported. Use: ${ALLOWED.join(', ')}`)
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large (max 50MB)')
      return
    }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('subject_mode', mode)
    try {
      await documentsApi.upload(fd)
      toast.success(`"${file.name}" uploaded — processing...`)
      await loadDocs()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Upload failed')
    } finally { setUploading(false) }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  const deleteDoc = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove it from the AI's knowledge.`)) return
    try {
      await documentsApi.delete(id)
      setDocs(prev => prev.filter(d => d.id !== id))
      toast.success('Document deleted')
    } catch { toast.error('Delete failed') }
  }

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
            dragOver
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 scale-[1.01]'
              : 'border-gray-200 dark:border-dark-border hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-dark-surface'
          )}
        >
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md"
            className="hidden" onChange={e => handleFiles(e.target.files)} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
              <p className="font-medium text-gray-700 dark:text-gray-300">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <Upload className="w-7 h-7 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Drop files here or <span className="text-brand-600 dark:text-brand-400">browse</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">PDF, DOCX, TXT, MD — up to 50MB each</p>
              </div>
            </div>
          )}
        </div>

        {/* Subject mode for upload */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Subject mode:</span>
          {['general', 'science', 'arts'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all',
                mode === m
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300'
              )}
            >{m}</button>
          ))}
          <button onClick={loadDocs} className="ml-auto btn-ghost btn-sm px-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Document list */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Your Documents ({docs.length})
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="shimmer h-20 rounded-xl" />)}
            </div>
          ) : docs.length === 0 ? (
            <div className="card p-10 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            docs.map(doc => {
              const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
              const StatusIcon = cfg.icon
              return (
                <div key={doc.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {doc.original_filename}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="uppercase font-mono">{doc.file_type}</span>
                      <span>{fmtSize(doc.file_size)}</span>
                      {doc.chunk_count > 0 && <span>{doc.chunk_count} chunks</span>}
                      {doc.page_count && <span>{doc.page_count} pages</span>}
                    </div>
                  </div>
                  <div className={clsx('flex items-center gap-1.5 text-xs font-medium flex-shrink-0', cfg.color)}>
                    <StatusIcon className={clsx('w-4 h-4', doc.status === 'processing' && 'animate-spin')} />
                    {cfg.label}
                  </div>
                  <button onClick={() => deleteDoc(doc.id, doc.original_filename)}
                    className="btn-ghost btn-sm px-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Info box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">How it works</p>
          <p>Once indexed, attach any document to a Chat session to get AI answers grounded in your file. You can also auto-generate flashcards and quizzes from documents.</p>
        </div>
      </div>
    </AppLayout>
  )
}
