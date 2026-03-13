'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [form, setForm]    = useState({ email: '', username: '', password: '', full_name: '' })
  const [loading, setLoad] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoad(true)
    try {
      const r = await authApi.register(form)
      setUser(r.data.user, r.data.access_token)
      toast.success('Account created! Welcome to EduAI 🎉')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoad(false) }
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-dark-bg dark:via-dark-surface dark:to-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand mb-3">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Join EduAI</h1>
          <p className="text-gray-500 text-sm mt-1">Start your AI learning journey</p>
        </div>

        <div className="card p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input type="text" value={form.full_name} onChange={f('full_name')} className="input" placeholder="Ada Lovelace" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username <span className="text-red-500">*</span></label>
              <input type="text" required value={form.username} onChange={f('username')} className="input" placeholder="adalovelace" minLength={3} maxLength={50} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input type="email" required value={form.email} onChange={f('email')} className="input" placeholder="you@university.edu" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password <span className="text-red-500">*</span></label>
              <input type="password" required value={form.password} onChange={f('password')} className="input" placeholder="Min. 8 characters" minLength={8} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary btn-md w-full mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
