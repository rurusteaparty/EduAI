'use client'
import AppLayout      from '@/components/layout/AppLayout'
import ChatInterface  from '@/components/chat/ChatInterface'
import { useEffect, useState } from 'react'
import { documentsApi } from '@/lib/api'

export default function ChatPage() {
  const [docs, setDocs] = useState([])

  useEffect(() => {
    documentsApi.getAll()
      .then(r => setDocs(r.data.filter((d: any) => d.status === 'indexed')))
      .catch(() => {})
  }, [])

  return (
    <AppLayout>
      <ChatInterface documents={docs} />
    </AppLayout>
  )
}
