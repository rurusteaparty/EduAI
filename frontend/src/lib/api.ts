import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('eduai_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// ─── Response interceptor: handle auth errors ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eduai_token')
        localStorage.removeItem('eduai_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  createSession: (data: any) => api.post('/chat/sessions', data),
  getSessions: (params?: any) => api.get('/chat/sessions', { params }),
  getMessages: (sessionId: number) => api.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (data: any) => api.post('/chat/send', data),
  deleteSession: (id: number) => api.delete(`/chat/sessions/${id}`),
}

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentsApi = {
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  getAll: (params?: any) => api.get('/documents/', { params }),
  getOne: (id: number) => api.get(`/documents/${id}`),
  delete: (id: number) => api.delete(`/documents/${id}`),
}

// ─── Flashcards ───────────────────────────────────────────────────────────────
export const flashcardsApi = {
  createDeck: (data: any) => api.post('/flashcards/decks', data),
  getDecks: () => api.get('/flashcards/decks'),
  getDeck: (id: number) => api.get(`/flashcards/decks/${id}`),
  getDueCards: (deckId: number, limit?: number) =>
    api.get(`/flashcards/decks/${deckId}/review`, { params: { limit } }),
  reviewCard: (cardId: number, quality: number) =>
    api.post(`/flashcards/cards/${cardId}/review`, { quality }),
  addCard: (deckId: number, data: any) =>
    api.post(`/flashcards/decks/${deckId}/cards`, data),
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export const quizApi = {
  generate: (data: any) => api.post('/quiz/generate', data),
  getAll: (params?: any) => api.get('/quiz/', { params }),
  getOne: (id: number) => api.get(`/quiz/${id}`),
  submit: (data: any) => api.post('/quiz/submit', data),
  getHistory: () => api.get('/quiz/attempts/history'),
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: (days?: number) => api.get('/analytics/dashboard', { params: { days } }),
  getStreaks: () => api.get('/analytics/streaks'),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
}
