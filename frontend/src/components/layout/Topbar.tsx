'use client'
import { usePathname } from 'next/navigation'
import { Moon, Sun, Type, Bell, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/store'
import { useTheme } from '@/hooks'
import { clsx } from 'clsx'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/chat':       'Chat Tutor',
  '/flashcards': 'Flashcards',
  '/quiz':       'Quiz Center',
  '/upload':     'Documents',
  '/analytics':  'Progress Analytics',
  '/settings':   'Settings',
}

const DIFF_COLORS = {
  beginner:     'badge-beginner',
  intermediate: 'badge-intermediate',
  advanced:     'badge-advanced',
}

export default function Topbar() {
  const pathname  = usePathname()
  const { user, logout } = useAuthStore()
  const { toggleDarkMode, toggleDyslexia } = useTheme()

  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] || 'EduAI'

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border">
      {/* Left: page title */}
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
        {pageTitle}
      </h1>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Difficulty badge */}
        {user && (
          <span className={clsx('badge capitalize', DIFF_COLORS[user.difficulty_level])}>
            {user.difficulty_level}
          </span>
        )}

        {/* Dyslexia mode */}
        <button
          onClick={toggleDyslexia}
          className={clsx(
            'btn-ghost btn-sm px-2.5 py-2 rounded-lg',
            user?.dyslexia_mode && 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
          )}
          title="Toggle dyslexia mode"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="btn-ghost btn-sm px-2.5 py-2 rounded-lg"
          title="Toggle dark mode"
        >
          {user?.dark_mode
            ? <Sun className="w-4 h-4 text-yellow-500" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1" />

        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-semibold">
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {user && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
              {user.username}
            </span>
          )}
          <button
            onClick={logout}
            className="btn-ghost btn-sm px-2 py-2 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
