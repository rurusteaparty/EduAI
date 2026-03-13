// ─── Enums ────────────────────────────────────────────────────────────────────

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type SubjectMode     = 'science'  | 'arts'        | 'general'
export type VerificationStatus = 'verified' | 'unverified' | 'flagged'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  username: string
  full_name?: string
  difficulty_level: DifficultyLevel
  subject_mode: SubjectMode
  dark_mode: boolean
  dyslexia_mode: boolean
  total_xp: number
  streak_days: number
  created_at: string
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: number
  title: string
  subject_mode: SubjectMode
  difficulty_level: DifficultyLevel
  document_id?: number
  created_at: string
  message_count?: number
}

export interface Source {
  content: string
  source: string
  page: number
  score: number
}

export interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  confidence_score?: number
  hallucination_flag: boolean
  verification_status?: VerificationStatus
  sources_used?: Source[]
  tokens_used?: number
  created_at: string
}

export interface ChatResponse {
  message: ChatMessage
  thinking?: string
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id: number
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  status: 'pending' | 'processing' | 'indexed' | 'failed'
  chunk_count: number
  page_count?: number
  word_count?: number
  subject_mode: SubjectMode
  created_at: string
  processed_at?: string
}

// ─── Flashcard ────────────────────────────────────────────────────────────────

export interface Flashcard {
  id: number
  front: string
  back: string
  hint?: string
  tags: string[]
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_date?: string
  times_seen: number
  times_correct: number
}

export interface FlashcardDeck {
  id: number
  title: string
  description?: string
  subject_mode: SubjectMode
  difficulty_level: DifficultyLevel
  is_ai_generated: boolean
  card_count: number
  cards?: Flashcard[]
  created_at: string
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'true_false' | 'short_answer'

export interface QuizQuestion {
  id: number
  question_text: string
  question_type: QuestionType
  options?: string[]
  correct_answer: string
  explanation?: string
  difficulty: DifficultyLevel
  points: number
  order_index: number
}

export interface Quiz {
  id: number
  title: string
  subject_mode: SubjectMode
  difficulty_level: DifficultyLevel
  question_count: number
  time_limit_minutes?: number
  is_ai_generated: boolean
  questions?: QuizQuestion[]
  created_at: string
}

export interface QuizAttempt {
  id: number
  quiz_id: number
  score: number
  total_points: number
  earned_points: number
  time_taken_seconds?: number
  is_completed: boolean
  answers: Record<string, any>
  feedback?: Record<string, QuestionFeedback>
  completed_at?: string
}

export interface QuestionFeedback {
  correct: boolean
  explanation: string
  correct_answer: string
  ai_feedback?: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ProgressSummary {
  total_xp: number
  streak_days: number
  total_chats: number
  total_quizzes: number
  total_flashcards_reviewed: number
  average_quiz_score: number
  documents_uploaded: number
  study_time_hours: number
}

export interface DailyActivity {
  date: string
  xp_earned: number
  activities: number
  quiz_score?: number
}

export interface SubjectBreakdown {
  subject: string
  sessions: number
  average_score: number
  xp: number
}

export interface AnalyticsDashboard {
  summary: ProgressSummary
  daily_activity: DailyActivity[]
  subject_breakdown: SubjectBreakdown[]
  recent_quiz_scores: number[]
  skill_levels: Record<string, number>
}
