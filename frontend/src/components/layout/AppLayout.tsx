'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useUIStore } from '@/store'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import { clsx } from 'clsx'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const { sidebarOpen } = useUIStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    // Apply saved preferences
    if (user?.dark_mode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    if (user?.dyslexia_mode) document.documentElement.classList.add('dyslexia')
    else document.documentElement.classList.remove('dyslexia')
  }, [isAuthenticated, user, router])

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg">
      <Sidebar />
      <div className={clsx(
        'flex flex-col flex-1 min-w-0 transition-all duration-300',
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'
      )}>
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
