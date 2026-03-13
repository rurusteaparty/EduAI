'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useAuthStore } from '@/store'
import { useTheme } from '@/hooks'
import { usersApi } from '@/lib/api'
import { Moon, Type, Zap, Save, Loader2, FlaskConical, Palette } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const { toggleDarkMode, toggleDyslexia } = useTheme()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name:        user?.full_name || '',
    subject_mode:     user?.subject_mode || 'general',
    difficulty_level: user?.difficulty_level || 'beginner',
  })

  const save = async () => {
    setSaving(true)
    try {
      const r = await usersApi.updateProfile(form)
      updateUser(r.data)
      toast.success('Settings saved!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Profile */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Profile</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <input className="input" value={form.full_name}
              onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
              placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1 text-sm text-gray-500 dark:text-gray-400">
            <div><span className="font-medium text-gray-700 dark:text-gray-300">Username: </span>{user.username}</div>
            <div><span className="font-medium text-gray-700 dark:text-gray-300">Email: </span>{user.email}</div>
          </div>
        </div>

        {/* Learning preferences */}
        <div className="card p-6 space-y-5">
          <h3 className="font-bold text-gray-900 dark:text-white">Learning Preferences</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject Mode</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 'general', icon: Zap,          label: 'General'        },
                { val: 'science', icon: FlaskConical,  label: 'Science / STEM' },
                { val: 'arts',    icon: Palette,       label: 'Arts / Humanities' },
              ].map(({ val, icon: Icon, label }) => (
                <button key={val} onClick={() => setForm(f => ({...f, subject_mode: val}))}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all',
                    form.subject_mode === val
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 'beginner',     color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500' },
                { val: 'intermediate', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500' },
                { val: 'advanced',     color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-500'   },
              ].map(({ val, color, bg, border }) => (
                <button key={val} onClick={() => setForm(f => ({...f, difficulty_level: val}))}
                  className={clsx(
                    'py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all',
                    form.difficulty_level === val
                      ? `${border} ${bg} ${color}`
                      : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >{val}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Accessibility */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Accessibility</h3>
          {[
            {
              label: 'Dark Mode',
              desc:  'Reduce eye strain in low-light environments',
              icon:  Moon,
              active: user.dark_mode,
              toggle: toggleDarkMode,
            },
            {
              label: 'Dyslexia Mode',
              desc:  'OpenDyslexic font with wider spacing for easier reading',
              icon:  Type,
              active: user.dyslexia_mode,
              toggle: toggleDyslexia,
            },
          ].map(({ label, desc, icon: Icon, active, toggle }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-dark-border last:border-0">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center',
                  active ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-100 dark:bg-dark-border'
                )}>
                  <Icon className={clsx('w-4 h-4', active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400')} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </div>
              <button onClick={toggle}
                className={clsx(
                  'w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0',
                  active ? 'bg-brand-600' : 'bg-gray-200 dark:bg-dark-border'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  active && 'translate-x-5'
                )} />
              </button>
            </div>
          ))}
        </div>

        {/* Save */}
        <button onClick={save} disabled={saving} className="btn-primary btn-md w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>

        {/* Account info */}
        <div className="card p-5 text-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Account Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{user.total_xp.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total XP</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-500">{user.streak_days}</p>
              <p className="text-xs text-gray-500">Day Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{user.difficulty_level}</p>
              <p className="text-xs text-gray-500">Level</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
