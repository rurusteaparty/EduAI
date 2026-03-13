from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
import logging

from app.db.session import get_db, AsyncSessionLocal
from app.models.models import User, ChatSession, ChatMessage, ProgressRecord
from app.schemas.schemas import (
    ChatSessionCreate, ChatSessionResponse,
    ChatMessageCreate, ChatMessageResponse, ChatResponse,
)
from app.core.security import get_current_user
from app.services.ai.tutor_service import TutorService
from app.services.ai.hallucination_detector import HallucinationDetector

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat")
tutor = TutorService()
detector = HallucinationDetector()


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(
        user_id=current_user.id, title=data.title,
        subject_mode=data.subject_mode, difficulty_level=data.difficulty_level,
        document_id=data.document_id,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return ChatSessionResponse.model_validate(session)


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 20,
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc()).offset(skip).limit(limit)
    )
    return [ChatSessionResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at)
    )
    return [ChatMessageResponse.model_validate(m) for m in result.scalars().all()]


@router.post("/send", response_model=ChatResponse)
async def send_message(
    data: ChatMessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == data.session_id, ChatSession.user_id == current_user.id)
        .options(selectinload(ChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.add(ChatMessage(session_id=session.id, role="user", content=data.content))
    await db.flush()

    history = [{"role": m.role, "content": m.content} for m in session.messages[-10:]]
    history.append({"role": "user", "content": data.content})

    ai_result = await tutor.generate_response(
        user_message=data.content, history=history,
        subject_mode=session.subject_mode.value,
        difficulty_level=session.difficulty_level.value,
        document_id=session.document_id, user_id=current_user.id,
    )
    detection = await detector.analyze(
        response=ai_result["content"], sources=ai_result.get("sources", []), query=data.content,
    )

    ai_msg = ChatMessage(
        session_id=session.id, role="assistant", content=ai_result["content"],
        confidence_score=detection["confidence_score"],
        hallucination_flag=detection["is_hallucination"],
        verification_status=detection["status"],
        sources_used=ai_result.get("sources", []),
        tokens_used=ai_result.get("tokens_used"),
    )
    db.add(ai_msg)
    if not session.messages:
        session.title = data.content[:50] + ("..." if len(data.content) > 50 else "")
    await db.flush()
    await db.refresh(ai_msg)

    # BUG FIX: background task opens its own session — request session closes before bg runs
    background_tasks.add_task(
        _log_progress_bg, user_id=current_user.id, activity_type="chat",
        activity_id=session.id, subject_mode=session.subject_mode.value,
        difficulty_level=session.difficulty_level.value, xp=5,
    )
    return ChatResponse(message=ChatMessageResponse.model_validate(ai_msg), thinking=detection.get("reasoning"))


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    return {"message": "Session deleted", "success": True}


# BUG FIX: uses own AsyncSessionLocal — safe for BackgroundTasks
async def _log_progress_bg(user_id, activity_type, activity_id, subject_mode, difficulty_level, xp):
    try:
        async with AsyncSessionLocal() as db:
            db.add(ProgressRecord(
                user_id=user_id, activity_type=activity_type, activity_id=activity_id,
                subject_mode=subject_mode, difficulty_level=difficulty_level, xp_earned=xp,
            ))
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.total_xp = (user.total_xp or 0) + xp
            await db.commit()
    except Exception as e:
        logger.error(f"_log_progress_bg error: {e}")
