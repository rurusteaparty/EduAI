from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone
import logging

from app.db.session import get_db, AsyncSessionLocal
from app.models.models import User, FlashcardDeck, Flashcard, ProgressRecord
from app.schemas.schemas import (
    FlashcardDeckCreate, FlashcardDeckResponse,
    FlashcardCreate, FlashcardResponse, FlashcardReview,
)
from app.core.security import get_current_user
from app.services.flashcard.generator import FlashcardGenerator
from app.services.flashcard.spaced_repetition import SM2Algorithm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/flashcards")
generator = FlashcardGenerator()
sm2 = SM2Algorithm()


@router.post("/decks", response_model=FlashcardDeckResponse)
async def create_deck(data: FlashcardDeckCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    deck = FlashcardDeck(
        user_id=current_user.id, title=data.title, description=data.description,
        subject_mode=data.subject_mode, difficulty_level=data.difficulty_level,
        document_id=data.document_id, is_ai_generated=True,
    )
    db.add(deck)
    await db.flush()
    await db.refresh(deck)
    # BUG FIX: pass user_id for secure document context lookup
    background_tasks.add_task(
        _generate_cards_bg, deck_id=deck.id, topic=data.topic,
        document_id=data.document_id, subject_mode=data.subject_mode.value,
        difficulty_level=data.difficulty_level.value, card_count=data.card_count,
        user_id=current_user.id,
    )
    return FlashcardDeckResponse.model_validate(deck)


@router.get("/decks", response_model=List[FlashcardDeckResponse])
async def get_decks(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlashcardDeck).where(FlashcardDeck.user_id == current_user.id).order_by(FlashcardDeck.created_at.desc()))
    return [FlashcardDeckResponse.model_validate(d) for d in result.scalars().all()]


@router.get("/decks/{deck_id}", response_model=FlashcardDeckResponse)
async def get_deck(deck_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FlashcardDeck).where(FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id)
        .options(selectinload(FlashcardDeck.cards))
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return FlashcardDeckResponse.model_validate(deck)


@router.get("/decks/{deck_id}/review", response_model=List[FlashcardResponse])
async def get_due_cards(deck_id: int, limit: int = 20, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Flashcard).join(FlashcardDeck).where(
            FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id,
            (Flashcard.next_review_date == None) | (Flashcard.next_review_date <= now),
        ).limit(limit)
    )
    return [FlashcardResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/cards/{card_id}/review", response_model=FlashcardResponse)
async def review_card(card_id: int, review: FlashcardReview, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Flashcard).join(FlashcardDeck).where(Flashcard.id == card_id, FlashcardDeck.user_id == current_user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    updated = sm2.calculate(quality=review.quality, ease_factor=card.ease_factor, interval=card.interval_days, repetitions=card.repetitions)
    card.ease_factor = updated["ease_factor"]
    card.interval_days = updated["interval"]
    card.repetitions = updated["repetitions"]
    card.next_review_date = updated["next_review_date"]
    card.last_reviewed = datetime.now(timezone.utc)
    card.times_seen += 1
    if review.quality >= 3:
        card.times_correct += 1
    await db.flush()
    await db.refresh(card)
    return FlashcardResponse.model_validate(card)


@router.post("/decks/{deck_id}/cards", response_model=FlashcardResponse)
async def add_card(deck_id: int, card_data: FlashcardCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id))
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    card = Flashcard(deck_id=deck_id, front=card_data.front, back=card_data.back, hint=card_data.hint, tags=card_data.tags)
    db.add(card)
    deck.card_count = (deck.card_count or 0) + 1
    await db.flush()
    await db.refresh(card)
    return FlashcardResponse.model_validate(card)


@router.delete("/decks/{deck_id}")
async def delete_deck(deck_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id))
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    await db.delete(deck)
    return {"message": "Deck deleted", "success": True}


# BUG FIX: uses own session + passes user_id to generator
async def _generate_cards_bg(deck_id, topic, document_id, subject_mode, difficulty_level, card_count, user_id):
    async with AsyncSessionLocal() as db:
        try:
            cards_data = await generator.generate(
                topic=topic, document_id=document_id, subject_mode=subject_mode,
                difficulty_level=difficulty_level, count=card_count, user_id=user_id,
            )
            if not cards_data:
                return
            cards = [Flashcard(deck_id=deck_id, front=c["front"], back=c["back"], hint=c.get("hint")) for c in cards_data]
            db.add_all(cards)
            result = await db.execute(select(FlashcardDeck).where(FlashcardDeck.id == deck_id))
            deck = result.scalar_one_or_none()
            if deck:
                deck.card_count = len(cards)
            await db.commit()
        except Exception as e:
            logger.error(f"_generate_cards_bg failed deck_id={deck_id}: {e}")
            await db.rollback()
