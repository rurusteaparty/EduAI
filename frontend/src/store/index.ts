import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  username: string
  full_name?: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  subject_mode: 'science' | 'arts' | 'general'
  dark_mode: boolean
  dyslexia_mode: boolean
  total_xp: number
  streak_days: number
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setUser: (user: User, token: string) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
}

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

interface SessionState {
  activeChatId: number | null
  setActiveChatId: (id: number | null) => void
  activeDocumentId: number | null
  setActiveDocumentId: (id: number | null) => void
}

// ─── Auth Store ───────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('eduai_token', token)
        }
        set({ user, token, isAuthenticated: true })
        
        // Apply accessibility settings
        if (user.dark_mode) document.documentElement.classList.add('dark')
        if (user.dyslexia_mode) document.documentElement.classList.add('dyslexia')
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('eduai_token')
          localStorage.removeItem('eduai_user')
        }
        document.documentElement.classList.remove('dark', 'dyslexia')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'eduai_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

// ─── UI Store ────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))

// ─── Session Store ────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>((set) => ({
  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),
  activeDocumentId: null,
  setActiveDocumentId: (id) => set({ activeDocumentId: id }),
}))

// ─── Derived helpers ─────────────────────────────────────────────────────────

export const getModeColor = (mode: string) => {
  switch (mode) {
    case 'science': return 'brand'
    case 'arts': return 'arts'
    default: return 'brand'
  }
}

export const getDifficultyColor = (level: string) => {
  switch (level) {
    case 'beginner': return 'success'
    case 'intermediate': return 'warning'
    case 'advanced': return 'danger'
    default: return 'brand'
  }
}

export const XP_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 10000]
export const getLevelFromXP = (xp: number): number => {
  return XP_THRESHOLDS.filter(t => xp >= t).length
}
export const getXPForNextLevel = (xp: number): { current: number; required: number; level: number } => {
  const level = getLevelFromXP(xp)
  const currentThreshold = XP_THRESHOLDS[level - 1] || 0
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1]
  return { current: xp - currentThreshold, required: nextThreshold - currentThreshold, level }
}
