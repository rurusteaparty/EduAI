# BUG FIX: removed Pydantic v1 `validator` import; replaced class Config with model_config
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class SubjectMode(str, Enum):
    SCIENCE = "science"
    ARTS = "arts"
    GENERAL = "general"


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    difficulty_level: DifficultyLevel
    subject_mode: SubjectMode
    dark_mode: bool
    dyslexia_mode: bool
    total_xp: int
    streak_days: int
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    difficulty_level: Optional[DifficultyLevel] = None
    subject_mode: Optional[SubjectMode] = None
    dark_mode: Optional[bool] = None
    dyslexia_mode: Optional[bool] = None


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
    subject_mode: SubjectMode = SubjectMode.GENERAL
    difficulty_level: DifficultyLevel = DifficultyLevel.BEGINNER
    document_id: Optional[int] = None


class ChatSessionResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    title: str
    subject_mode: SubjectMode
    difficulty_level: DifficultyLevel
    document_id: Optional[int] = None
    created_at: datetime
    message_count: Optional[int] = 0


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    session_id: int


class ChatMessageResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    session_id: int
    role: str
    content: str
    confidence_score: Optional[float] = None
    hallucination_flag: bool = False
    verification_status: Optional[str] = None
    sources_used: Optional[List[Dict[str, Any]]] = None
    tokens_used: Optional[int] = None
    created_at: datetime


class ChatResponse(BaseModel):
    message: ChatMessageResponse
    thinking: Optional[str] = None


class DocumentResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    status: str
    chunk_count: int
    page_count: Optional[int] = None
    word_count: Optional[int] = None
    subject_mode: SubjectMode
    created_at: datetime
    processed_at: Optional[datetime] = None


class FlashcardCreate(BaseModel):
    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)
    hint: Optional[str] = None
    tags: List[str] = []


class FlashcardResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    front: str
    back: str
    hint: Optional[str] = None
    tags: List[str] = []
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_date: Optional[datetime] = None
    times_seen: int
    times_correct: int


class FlashcardDeckCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    subject_mode: SubjectMode = SubjectMode.GENERAL
    difficulty_level: DifficultyLevel = DifficultyLevel.BEGINNER
    document_id: Optional[int] = None
    topic: Optional[str] = None
    card_count: int = Field(default=10, ge=5, le=50)


class FlashcardDeckResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    title: str
    description: Optional[str] = None
    subject_mode: SubjectMode
    difficulty_level: DifficultyLevel
    is_ai_generated: bool
    card_count: int
    cards: Optional[List[FlashcardResponse]] = None
    created_at: datetime


class FlashcardReview(BaseModel):
    quality: int = Field(..., ge=0, le=5)


class QuizCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    subject_mode: SubjectMode = SubjectMode.GENERAL
    difficulty_level: DifficultyLevel = DifficultyLevel.BEGINNER
    document_id: Optional[int] = None
    topic: Optional[str] = None
    question_count: int = Field(default=10, ge=3, le=30)
    time_limit_minutes: Optional[int] = None
    question_types: List[str] = ["mcq"]


class QuizQuestionResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: DifficultyLevel
    points: int
    order_index: int


class QuizResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    title: str
    subject_mode: SubjectMode
    difficulty_level: DifficultyLevel
    question_count: int
    time_limit_minutes: Optional[int] = None
    is_ai_generated: bool
    questions: Optional[List[QuizQuestionResponse]] = None
    created_at: datetime


class QuizSubmission(BaseModel):
    quiz_id: int
    answers: Dict[str, str]
    time_taken_seconds: Optional[int] = None


class QuizAttemptResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    quiz_id: int
    score: float
    total_points: int
    earned_points: int
    time_taken_seconds: Optional[int] = None
    is_completed: bool
    answers: Dict[str, Any]
    feedback: Optional[Dict[str, Any]] = None
    completed_at: Optional[datetime] = None


class ProgressSummary(BaseModel):
    total_xp: int
    streak_days: int
    total_chats: int
    total_quizzes: int
    total_flashcards_reviewed: int
    average_quiz_score: float
    documents_uploaded: int
    study_time_hours: float


class DailyActivity(BaseModel):
    date: str
    xp_earned: int
    activities: int
    quiz_score: Optional[float] = None


class SubjectBreakdown(BaseModel):
    subject: str
    sessions: int
    average_score: float
    xp: int


class AnalyticsDashboard(BaseModel):
    summary: ProgressSummary
    daily_activity: List[DailyActivity]
    subject_breakdown: List[SubjectBreakdown]
    recent_quiz_scores: List[float]
    skill_levels: Dict[str, float]


class MessageResponse(BaseModel):
    message: str
    success: bool = True
