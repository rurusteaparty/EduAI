'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store'

// ─── useDebounce ──────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ─── useLocalStorage ──────────────────────────────────────────────────────────
export function useLocalStorage<T>(key: string, init: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return init
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : init
    } catch { return init }
  })
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])
  return [value, set] as const
}

// ─── useTimer ─────────────────────────────────────────────────────────────────
export function useTimer(initialSeconds: number = 0) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const ref = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else {
      clearInterval(ref.current)
    }
    return () => clearInterval(ref.current)
  }, [running])

  const start = () => setRunning(true)
  const pause = () => setRunning(false)
  const reset = () => { setSeconds(0); setRunning(false) }

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return { seconds, formatted, running, start, pause, reset }
}

// ─── useTheme ─────────────────────────────────────────────────────────────────
export function useTheme() {
  const { user, updateUser } = useAuthStore()

  const toggleDarkMode = useCallback(async () => {
    const newVal = !user?.dark_mode
    document.documentElement.classList.toggle('dark', newVal)
    updateUser({ dark_mode: newVal })
    try {
      const { usersApi } = await import('@/lib/api')
      await usersApi.updateProfile({ dark_mode: newVal })
    } catch {}
  }, [user?.dark_mode, updateUser])

  const toggleDyslexia = useCallback(async () => {
    const newVal = !user?.dyslexia_mode
    document.documentElement.classList.toggle('dyslexia', newVal)
    updateUser({ dyslexia_mode: newVal })
    try {
      const { usersApi } = await import('@/lib/api')
      await usersApi.updateProfile({ dyslexia_mode: newVal })
    } catch {}
  }, [user?.dyslexia_mode, updateUser])

  return { toggleDarkMode, toggleDyslexia }
}

// ─── useScrollBottom ─────────────────────────────────────────────────────────
export function useScrollBottom(dep: any) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [dep])
  return ref
}

// ─── useCountUp ──────────────────────────────────────────────────────────────
export function useCountUp(target: number, duration: number = 1000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return count
}
