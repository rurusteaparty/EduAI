'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageCircle, BookOpen, Trophy,
  Upload, BarChart3, Settings, Zap, FlaskConical,
  Palette, ChevronLeft, ChevronRight, Star, Flame
} from 'lucide-react'
import { useAuthStore, useUIStore, getLevelFromXP, getXPForNextLevel } from '@/store'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/chat',       icon: MessageCircle,   label: 'Chat Tutor' },
  { href: '/flashcards', icon: BookOpen,         label: 'Flashcards' },
  { href: '/quiz',       icon: Trophy,           label: 'Quiz Center' },
  { href: '/upload',     icon: Upload,           label: 'Documents'  },
  { href: '/analytics',  icon: BarChart3,        label: 'Analytics'  },
  { href: '/settings',   icon: Settings,         label: 'Settings'   },
]

const MODE_ICONS = { science: FlaskConical, arts: Palette, general: Zap }
const MODE_LABELS = { science: 'Science Mode', arts: 'Arts Mode', general: 'General' }
const MODE_COLORS = {
  science: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20',
  arts:    'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  general: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  if (!user) return null

  const ModeIcon = MODE_ICONS[user.subject_mode] || Zap
  const { current, required, level } = getXPForNextLevel(user.total_xp)
  const xpPct = Math.min(100, Math.floor((current / required) * 100))

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={clsx(
        'fixed left-0 top-0 h-screen z-30 flex flex-col bg-white dark:bg-dark-surface border-r border-gray-100 dark:border-dark-border transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* ── Logo ─────────────────────────────────────────── */}
        <div className="flex items-center h-16 px-4 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-base text-gray-900 dark:text-white truncate">
                EduAI
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* ── User Mode Badge ───────────────────────────────── */}
        {sidebarOpen && (
          <div className="mx-3 mt-3">
            <div className={clsx('flex items-center gap-2 rounded-xl px-3 py-2', MODE_COLORS[user.subject_mode])}>
              <ModeIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-semibold truncate">{MODE_LABELS[user.subject_mode]}</span>
            </div>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group relative',
                  active
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border hover:text-gray-900 dark:hover:text-gray-100'
                )}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className={clsx(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                )} />
                {sidebarOpen && <span className="truncate">{label}</span>}
                {active && sidebarOpen && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                    {label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── XP / Level Bar ────────────────────────────────── */}
        <div className="border-t border-gray-100 dark:border-dark-border p-3">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Level {level}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="w-3 h-3" />
                  <span className="font-medium">{user.streak_days}d</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{user.total_xp.toLocaleString()} XP</span>
                <span>{current}/{required}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                {level}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
