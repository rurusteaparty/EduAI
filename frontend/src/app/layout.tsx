import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'EduAI Platform — AI-Powered Learning',
  description: 'Adaptive AI tutor with RAG, flashcards, quizzes, and analytics',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/opendyslexic"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-200`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg, #fff)',
              color: 'var(--toast-color, #111)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              fontSize: '14px',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  )
}
