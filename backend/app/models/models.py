from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, 
    ForeignKey, JSON, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.session import Base


class DifficultyLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"



class SubjectMode(str, enum.Enum):
    SCIENCE = "science"
    ARTS = "arts"
    GENERAL = "general"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Preferences
    difficulty_level = Column(SAEnum(DifficultyLevel, values_callable=lambda obj: [e.value for e in obj], name="difficulty_level", create_type=False), default=DifficultyLevel.BEGINNER)
    subject_mode = Column(SAEnum(SubjectMode, values_callable=lambda obj: [e.value for e in obj], name="subject_mode", create_type=False), default=SubjectMode.GENERAL)
    dark_mode = Column(Boolean, default=False)
    dyslexia_mode = Column(Boolean, default=False)
    
    # Stats
    total_xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_active = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    flashcard_decks = relationship("FlashcardDeck", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    progress_records = relationship("ProgressRecord", back_populates="user", cascade="all, delete-orphan")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="New Chat")
    subject_mode = Column(SAEnum(SubjectMode, values_callable=lambda obj: [e.value for e in obj], name="subject_mode", create_type=False), default=SubjectMode.GENERAL)
    difficulty_level = Column(SAEnum(DifficultyLevel, values_callable=lambda obj: [e.value for e in obj], name="difficulty_level", create_type=False), default=DifficultyLevel.BEGINNER)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    document = relationship("Document")

    __table_args__ = (Index("ix_chat_sessions_user_id", "user_id"),)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    
    # AI Metadata
    confidence_score = Column(Float, nullable=True)
    hallucination_flag = Column(Boolean, default=False)
    verification_status = Column(String(50), nullable=True)  # verified | unverified | flagged
    sources_used = Column(JSON, nullable=True)  # List of source chunks used
    tokens_used = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")

    __table_args__ = (Index("ix_chat_messages_session_id", "session_id"),)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf | docx | txt | md
    file_size = Column(Integer, nullable=False)  # bytes
    file_path = Column(String(500), nullable=False)
    
    # Processing status
    status = Column(String(50), default="pending")  # pending | processing | indexed | failed
    chunk_count = Column(Integer, default=0)
    faiss_index_id = Column(String(255), nullable=True)  # namespace in FAISS
    
    # Metadata
    page_count = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)
    subject_mode = Column(SAEnum(SubjectMode, values_callable=lambda obj: [e.value for e in obj], name="subject_mode", create_type=False), default=SubjectMode.GENERAL)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="documents")

    __table_args__ = (Index("ix_documents_user_id", "user_id"),)


class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_mode = Column(SAEnum(SubjectMode, values_callable=lambda obj: [e.value for e in obj], name="subject_mode", create_type=False), default=SubjectMode.GENERAL)
    difficulty_level = Column(SAEnum(DifficultyLevel, values_callable=lambda obj: [e.value for e in obj], name="difficulty_level", create_type=False), default=DifficultyLevel.BEGINNER)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    is_ai_generated = Column(Boolean, default=True)
    card_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="flashcard_decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")
    document = relationship("Document")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id", ondelete="CASCADE"), nullable=False)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    hint = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    
    # Spaced Repetition (SM-2 Algorithm)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=1)
    repetitions = Column(Integer, default=0)
    next_review_date = Column(DateTime(timezone=True), nullable=True)
    last_reviewed = Column(DateTime(timezone=True), nullable=True)
    
    # Performance
    times_seen = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deck = relationship("FlashcardDeck", back_populates="cards")

    __table_args__ = (Index("ix_flashcards_deck_id", "deck_id"),)


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    subject_mode = Column(SAEnum(SubjectMode, values_callable=lambda obj: [e.value for e in obj], name="subject_mode", create_type=False), default=SubjectMode.GENERAL)
    difficulty_level = Column(SAEnum(DifficultyLevel, values_callable=lambda obj: [e.value for e in obj], name="difficulty_level", create_type=False), default=DifficultyLevel.BEGINNER)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    question_count = Column(Integer, default=10)
    time_limit_minutes = Column(Integer, nullable=True)
    is_ai_generated = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")
    document = relationship("Document")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="mcq")  # mcq | true_false | short_answer
    options = Column(JSON, nullable=True)  # List of options for MCQ
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(SAEnum(DifficultyLevel, values_callable=lambda obj: [e.value for e in obj], name="difficulty_level", create_type=False), default=DifficultyLevel.BEGINNER)
    points = Column(Integer, default=10)
    order_index = Column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="questions")

    __table_args__ = (Index("ix_quiz_questions_quiz_id", "quiz_id"),)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    
    score = Column(Float, default=0.0)  # percentage
    total_points = Column(Integer, default=0)
    earned_points = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, nullable=True)
    answers = Column(JSON, default=dict)  # {question_id: user_answer}
    is_completed = Column(Boolean, default=False)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")


class ProgressRecord(Base):
    __tablename__ = "progress_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    activity_type = Column(String(50), nullable=False)  # chat | quiz | flashcard | upload
    activity_id = Column(Integer, nullable=True)
    subject_mode = Column(SAEnum(SubjectMode, values_callable=lambda obj: [e.value for e in obj], name="subject_mode", create_type=False), default=SubjectMode.GENERAL)
    difficulty_level = Column(SAEnum(DifficultyLevel, values_callable=lambda obj: [e.value for e in obj], name="difficulty_level", create_type=False), default=DifficultyLevel.BEGINNER)
    
    score = Column(Float, nullable=True)
    xp_earned = Column(Integer, default=0)
    duration_seconds = Column(Integer, nullable=True)
    record_metadata = Column("metadata", JSON, default=dict)    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="progress_records")

    __table_args__ = (Index("ix_progress_records_user_id", "user_id"),)
