from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone
import logging

from app.db.session import get_db
from app.models.models import User, Quiz, QuizQuestion, QuizAttempt, ProgressRecord
from app.schemas.schemas import QuizCreate, QuizResponse, QuizSubmission, QuizAttemptResponse
from app.core.security import get_current_user
from app.services.quiz.generator import QuizGenerator
from app.services.quiz.evaluator import QuizEvaluator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quiz")
quiz_gen = QuizGenerator()
evaluator = QuizEvaluator()


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(data: QuizCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # BUG FIX: pass user_id so generator uses user-scoped FAISS namespace (security fix)
    questions_data = await quiz_gen.generate(
        topic=data.topic, document_id=data.document_id,
        subject_mode=data.subject_mode.value, difficulty_level=data.difficulty_level.value,
        count=data.question_count, question_types=data.question_types,
        user_id=current_user.id,
    )
    if not questions_data:
        raise HTTPException(status_code=502, detail="AI failed to generate questions. Try again.")

    quiz = Quiz(
        user_id=current_user.id, title=data.title,
        subject_mode=data.subject_mode, difficulty_level=data.difficulty_level,
        document_id=data.document_id, question_count=len(questions_data),
        time_limit_minutes=data.time_limit_minutes, is_ai_generated=True,
    )
    db.add(quiz)
    await db.flush()
    for i, q in enumerate(questions_data):
        db.add(QuizQuestion(
            quiz_id=quiz.id, question_text=q["question"],
            question_type=q.get("type", "mcq"), options=q.get("options"),
            correct_answer=q["correct_answer"], explanation=q.get("explanation"),
            difficulty=data.difficulty_level, points=q.get("points", 10), order_index=i,
        ))
    await db.flush()
    result = await db.execute(select(Quiz).where(Quiz.id == quiz.id).options(selectinload(Quiz.questions)))
    return QuizResponse.model_validate(result.scalar_one())


@router.get("/", response_model=List[QuizResponse])
async def get_quizzes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), skip: int = 0, limit: int = 20):
    result = await db.execute(select(Quiz).where(Quiz.user_id == current_user.id).order_by(Quiz.created_at.desc()).offset(skip).limit(limit))
    return [QuizResponse.model_validate(q) for q in result.scalars().all()]


# BUG FIX: this route MUST be above /{quiz_id} — "attempts" was being captured as an integer id
@router.get("/attempts/history", response_model=List[QuizAttemptResponse])
async def get_attempt_history(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), limit: int = 20):
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id, QuizAttempt.is_completed == True)
        .order_by(QuizAttempt.completed_at.desc()).limit(limit)
    )
    return [QuizAttemptResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(quiz_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == current_user.id).options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return QuizResponse.model_validate(quiz)


@router.post("/submit", response_model=QuizAttemptResponse)
async def submit_quiz(submission: QuizSubmission, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Quiz).where(Quiz.id == submission.quiz_id, Quiz.user_id == current_user.id).options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    eval_result = await evaluator.evaluate(questions=quiz.questions, user_answers=submission.answers)

    attempt = QuizAttempt(
        user_id=current_user.id, quiz_id=quiz.id,
        score=eval_result["score"], total_points=eval_result["total_points"],
        earned_points=eval_result["earned_points"],
        time_taken_seconds=submission.time_taken_seconds,
        answers=eval_result["detailed_answers"], is_completed=True,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    xp = int(eval_result["score"] / 10) * 5
    db.add(ProgressRecord(
        user_id=current_user.id, activity_type="quiz", activity_id=quiz.id,
        subject_mode=quiz.subject_mode.value, difficulty_level=quiz.difficulty_level.value,
        score=eval_result["score"], xp_earned=xp, duration_seconds=submission.time_taken_seconds,
    ))
    result2 = await db.execute(select(User).where(User.id == current_user.id))
    user = result2.scalar_one_or_none()
    if user:
        user.total_xp = (user.total_xp or 0) + xp
    await db.flush()
    await db.refresh(attempt)
    resp = QuizAttemptResponse.model_validate(attempt)
    resp.feedback = eval_result["feedback"]
    return resp
