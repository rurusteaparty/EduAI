'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [show, setShow]     = useState(false)
  const [loading, setLoad]  = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoad(true)
    try {
      const r = await authApi.login(form)
      setUser(r.data.user, r.data.access_token)
      toast.success(`Welcome back, ${r.data.user.username}!`)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally { setLoad(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-dark-bg dark:via-dark-surface dark:to-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand mb-3">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EduAI Platform</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">AI-powered learning for every student</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Sign in to your account</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                type="email" required autoComplete="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary btn-md w-full mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 text-center">
          Demo: <strong>demo@eduai.com</strong> / <strong>demo1234</strong>
        </div>
      </div>
    </div>
  )
}
