from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import List

from app.db.session import get_db
from app.models.models import User, ProgressRecord, QuizAttempt, ChatSession, Document, FlashcardDeck
from app.schemas.schemas import AnalyticsDashboard, ProgressSummary, DailyActivity, SubjectBreakdown
from app.core.security import get_current_user

router = APIRouter(prefix="/analytics")


@router.get("/dashboard", response_model=AnalyticsDashboard)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = 30,
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Summary stats
    chat_count = await db.scalar(
        select(func.count(ChatSession.id)).where(ChatSession.user_id == current_user.id)
    )
    quiz_count = await db.scalar(
        select(func.count(QuizAttempt.id)).where(
            QuizAttempt.user_id == current_user.id,
            QuizAttempt.is_completed == True,
        )
    )
    avg_score = await db.scalar(
        select(func.avg(QuizAttempt.score)).where(
            QuizAttempt.user_id == current_user.id,
            QuizAttempt.is_completed == True,
        )
    )
    doc_count = await db.scalar(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    flashcard_reviews = await db.scalar(
        select(func.sum(ProgressRecord.xp_earned)).where(
            ProgressRecord.user_id == current_user.id,
            ProgressRecord.activity_type == "flashcard",
        )
    )
    total_duration = await db.scalar(
        select(func.sum(ProgressRecord.duration_seconds)).where(
            ProgressRecord.user_id == current_user.id,
        )
    )

    summary = ProgressSummary(
        total_xp=current_user.total_xp or 0,
        streak_days=current_user.streak_days or 0,
        total_chats=chat_count or 0,
        total_quizzes=quiz_count or 0,
        total_flashcards_reviewed=flashcard_reviews or 0,
        average_quiz_score=round(avg_score or 0.0, 1),
        documents_uploaded=doc_count or 0,
        study_time_hours=round((total_duration or 0) / 3600, 1),
    )

    # Daily activity (last N days)
    daily_result = await db.execute(
        select(
            func.date(ProgressRecord.created_at).label("date"),
            func.sum(ProgressRecord.xp_earned).label("xp"),
            func.count(ProgressRecord.id).label("activities"),
        )
        .where(
            ProgressRecord.user_id == current_user.id,
            ProgressRecord.created_at >= since,
        )
        .group_by(func.date(ProgressRecord.created_at))
        .order_by(func.date(ProgressRecord.created_at))
    )
    daily_rows = daily_result.all()

    # Get quiz scores per day
    quiz_daily = await db.execute(
        select(
            func.date(QuizAttempt.completed_at).label("date"),
            func.avg(QuizAttempt.score).label("avg_score"),
        )
        .where(
            QuizAttempt.user_id == current_user.id,
            QuizAttempt.completed_at >= since,
            QuizAttempt.is_completed == True,
        )
        .group_by(func.date(QuizAttempt.completed_at))
    )
    quiz_score_map = {str(r.date): r.avg_score for r in quiz_daily.all()}

    daily_activity = [
        DailyActivity(
            date=str(row.date),
            xp_earned=row.xp or 0,
            activities=row.activities or 0,
            quiz_score=quiz_score_map.get(str(row.date)),
        )
        for row in daily_rows
    ]

    # Subject breakdown
    subject_result = await db.execute(
        select(
            ProgressRecord.subject_mode,
            func.count(ProgressRecord.id).label("sessions"),
            func.avg(ProgressRecord.score).label("avg_score"),
            func.sum(ProgressRecord.xp_earned).label("xp"),
        )
        .where(ProgressRecord.user_id == current_user.id)
        .group_by(ProgressRecord.subject_mode)
    )
    subject_rows = subject_result.all()

    subject_breakdown = [
        SubjectBreakdown(
            subject=row.subject_mode or "general",
            sessions=row.sessions or 0,
            average_score=round(row.avg_score or 0.0, 1),
            xp=row.xp or 0,
        )
        for row in subject_rows
    ]

    # Recent quiz scores
    recent_scores_result = await db.execute(
        select(QuizAttempt.score)
        .where(QuizAttempt.user_id == current_user.id, QuizAttempt.is_completed == True)
        .order_by(QuizAttempt.completed_at.desc())
        .limit(10)
    )
    recent_scores = [r[0] for r in recent_scores_result.all()]

    # Skill levels (0–100 per subject)
    skill_levels = {}
    for row in subject_rows:
        subject = row.subject_mode or "general"
        sessions = row.sessions or 0
        avg = row.avg_score or 50.0
        skill_levels[subject] = min(100, round((sessions * 2 + avg) / 3, 1))

    return AnalyticsDashboard(
        summary=summary,
        daily_activity=daily_activity,
        subject_breakdown=subject_breakdown,
        recent_quiz_scores=recent_scores,
        skill_levels=skill_levels,
    )


@router.get("/streaks")
async def get_streak_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get last 30 days of activity
    since = datetime.now(timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(func.date(ProgressRecord.created_at).label("date"))
        .where(ProgressRecord.user_id == current_user.id, ProgressRecord.created_at >= since)
        .group_by(func.date(ProgressRecord.created_at))
        .order_by(func.date(ProgressRecord.created_at).desc())
    )
    active_days = [str(r.date) for r in result.all()]

    return {
        "streak_days": current_user.streak_days,
        "active_days": active_days,
        "longest_streak": current_user.streak_days,  # Would compute properly
    }
