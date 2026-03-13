-- ============================================================
--  EduAI Platform — PostgreSQL Schema
--  Run via: psql -U eduai -d eduai -f init.sql
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subject_mode AS ENUM ('science', 'arts', 'general');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    email               VARCHAR(255) UNIQUE NOT NULL,
    username            VARCHAR(100) UNIQUE NOT NULL,
    hashed_password     VARCHAR(255) NOT NULL,
    full_name           VARCHAR(255),
    is_active           BOOLEAN DEFAULT TRUE,
    is_verified         BOOLEAN DEFAULT FALSE,
    
    -- Preferences
    difficulty_level    difficulty_level DEFAULT 'beginner',
    subject_mode        subject_mode DEFAULT 'general',
    dark_mode           BOOLEAN DEFAULT FALSE,
    dyslexia_mode       BOOLEAN DEFAULT FALSE,
    
    -- Gamification
    total_xp            INTEGER DEFAULT 0,
    streak_days         INTEGER DEFAULT 0,
    last_active         TIMESTAMPTZ DEFAULT NOW(),
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ─── CHAT SESSIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_sessions (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255) DEFAULT 'New Chat',
    subject_mode        subject_mode DEFAULT 'general',
    difficulty_level    difficulty_level DEFAULT 'beginner',
    document_id         INTEGER,  -- FK added after documents table
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- ─── CHAT MESSAGES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
    id                  SERIAL PRIMARY KEY,
    session_id          INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content             TEXT NOT NULL,
    
    -- AI metadata
    confidence_score    FLOAT,
    hallucination_flag  BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50),
    sources_used        JSONB DEFAULT '[]',
    tokens_used         INTEGER,
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_hallucination ON chat_messages(hallucination_flag) WHERE hallucination_flag = TRUE;

-- ─── DOCUMENTS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename            VARCHAR(255) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    file_type           VARCHAR(20) NOT NULL,
    file_size           INTEGER NOT NULL,
    file_path           VARCHAR(500) NOT NULL,
    
    -- Processing
    status              VARCHAR(50) DEFAULT 'pending',
    chunk_count         INTEGER DEFAULT 0,
    faiss_index_id      VARCHAR(255),
    
    -- Metadata
    page_count          INTEGER,
    word_count          INTEGER,
    subject_mode        subject_mode DEFAULT 'general',
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Add FK constraint for chat_sessions.document_id
ALTER TABLE chat_sessions 
    ADD CONSTRAINT fk_chat_session_document 
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- ─── FLASHCARD DECKS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcard_decks (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    subject_mode        subject_mode DEFAULT 'general',
    difficulty_level    difficulty_level DEFAULT 'beginner',
    document_id         INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    is_ai_generated     BOOLEAN DEFAULT TRUE,
    card_count          INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);

-- ─── FLASHCARDS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcards (
    id                  SERIAL PRIMARY KEY,
    deck_id             INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    front               TEXT NOT NULL,
    back                TEXT NOT NULL,
    hint                TEXT,
    tags                JSONB DEFAULT '[]',
    
    -- SM-2 Spaced Repetition
    ease_factor         FLOAT DEFAULT 2.5,
    interval_days       INTEGER DEFAULT 1,
    repetitions         INTEGER DEFAULT 0,
    next_review_date    TIMESTAMPTZ,
    last_reviewed       TIMESTAMPTZ,
    
    -- Performance
    times_seen          INTEGER DEFAULT 0,
    times_correct       INTEGER DEFAULT 0,
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcards_due ON flashcards(next_review_date) WHERE next_review_date IS NOT NULL;

-- ─── QUIZZES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quizzes (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    subject_mode        subject_mode DEFAULT 'general',
    difficulty_level    difficulty_level DEFAULT 'beginner',
    document_id         INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    question_count      INTEGER DEFAULT 10,
    time_limit_minutes  INTEGER,
    is_ai_generated     BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);

-- ─── QUIZ QUESTIONS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quiz_questions (
    id                  SERIAL PRIMARY KEY,
    quiz_id             INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text       TEXT NOT NULL,
    question_type       VARCHAR(50) DEFAULT 'mcq',
    options             JSONB,
    correct_answer      TEXT NOT NULL,
    explanation         TEXT,
    difficulty          difficulty_level DEFAULT 'beginner',
    points              INTEGER DEFAULT 10,
    order_index         INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- ─── QUIZ ATTEMPTS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id             INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score               FLOAT DEFAULT 0.0,
    total_points        INTEGER DEFAULT 0,
    earned_points       INTEGER DEFAULT 0,
    time_taken_seconds  INTEGER,
    answers             JSONB DEFAULT '{}',
    is_completed        BOOLEAN DEFAULT FALSE,
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(is_completed, completed_at DESC);

-- ─── PROGRESS RECORDS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS progress_records (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type       VARCHAR(50) NOT NULL,  -- chat | quiz | flashcard | upload
    activity_id         INTEGER,
    subject_mode        subject_mode DEFAULT 'general',
    difficulty_level    difficulty_level DEFAULT 'beginner',
    score               FLOAT,
    xp_earned           INTEGER DEFAULT 0,
    duration_seconds    INTEGER,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_records_user_id ON progress_records(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_records_created_at ON progress_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_records_activity_type ON progress_records(user_id, activity_type);
-- Add a generated column for the day
ALTER TABLE progress_records
ADD COLUMN IF NOT EXISTS created_day DATE GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::DATE) STORED;

-- Index on the generated column
CREATE INDEX IF NOT EXISTS idx_progress_records_daily 
ON progress_records(user_id, created_day);
-- ─── VIEWS ────────────────────────────────────────────────────────────────────

-- Daily activity summary view
CREATE OR REPLACE VIEW daily_activity_summary AS
SELECT 
    user_id,
    DATE(created_at) AS activity_date,
    COUNT(*) AS total_activities,
    SUM(xp_earned) AS total_xp,
    AVG(score) FILTER (WHERE score IS NOT NULL) AS avg_score,
    SUM(duration_seconds) AS total_duration_seconds
FROM progress_records
GROUP BY user_id, DATE(created_at);

-- User statistics view
CREATE OR REPLACE VIEW user_statistics AS
SELECT
    u.id AS user_id,
    u.username,
    u.total_xp,
    u.streak_days,
    COUNT(DISTINCT cs.id) AS total_chat_sessions,
    COUNT(DISTINCT qa.id) FILTER (WHERE qa.is_completed) AS total_quiz_attempts,
    AVG(qa.score) FILTER (WHERE qa.is_completed) AS avg_quiz_score,
    COUNT(DISTINCT d.id) AS documents_uploaded,
    COUNT(DISTINCT fd.id) AS flashcard_decks
FROM users u
LEFT JOIN chat_sessions cs ON cs.user_id = u.id
LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
LEFT JOIN documents d ON d.user_id = u.id
LEFT JOIN flashcard_decks fd ON fd.user_id = u.id
GROUP BY u.id, u.username, u.total_xp, u.streak_days;

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

-- Insert demo user (password: demo1234)
INSERT INTO users (email, username, hashed_password, full_name, is_verified)
VALUES (
    'demo@eduai.com',
    'demo_student',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Demo Student',
    true
) ON CONFLICT DO NOTHING;

COMMIT;
