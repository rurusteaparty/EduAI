from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os, uuid, aiofiles, logging
from datetime import datetime, timezone

from app.db.session import get_db, AsyncSessionLocal
from app.models.models import User, Document
from app.schemas.schemas import DocumentResponse, SubjectMode
from app.core.security import get_current_user
from app.core.config import settings
from app.services.rag.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents")
processor = DocumentProcessor()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_mode: SubjectMode = SubjectMode.GENERAL,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed. Allowed: {', '.join(settings.allowed_extensions_list)}")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Max: {settings.MAX_UPLOAD_SIZE_MB}MB")

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    user_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, unique_filename)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    doc = Document(
        user_id=current_user.id, filename=unique_filename,
        original_filename=file.filename, file_type=ext,
        file_size=len(content), file_path=file_path,
        subject_mode=subject_mode, status="pending",
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    # BUG FIX: function now defined below (was missing — NameError at runtime)
    background_tasks.add_task(_process_document_bg, doc.id, file_path, current_user.id)
    return DocumentResponse.model_validate(doc)


@router.get("/", response_model=List[DocumentResponse])
async def get_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 20,
):
    result = await db.execute(
        select(Document).where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc()).offset(skip).limit(limit)
    )
    return [DocumentResponse.model_validate(d) for d in result.scalars().all()]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.user_id == current_user.id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.user_id == current_user.id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.faiss_index_id:
        from app.services.rag.vector_store import faiss_store
        await faiss_store.delete_document(doc.faiss_index_id)
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    await db.delete(doc)
    return {"message": "Document deleted", "success": True}


# BUG FIX: this function was completely missing from the original file
async def _process_document_bg(doc_id: int, file_path: str, user_id: int):
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if not doc:
                return
            doc.status = "processing"
            await db.commit()

            index_id, chunk_count, metadata = await processor.process_and_index(
                file_path=file_path, user_id=user_id, doc_id=doc_id,
            )
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "indexed"
                doc.faiss_index_id = index_id
                doc.chunk_count = chunk_count
                doc.page_count = metadata.get("page_count")
                doc.word_count = metadata.get("word_count")
                doc.processed_at = datetime.now(timezone.utc)
                await db.commit()
        except Exception as e:
            logger.error(f"Document processing failed doc_id={doc_id}: {e}")
            try:
                async with AsyncSessionLocal() as db2:
                    result = await db2.execute(select(Document).where(Document.id == doc_id))
                    doc = result.scalar_one_or_none()
                    if doc:
                        doc.status = "failed"
                        await db2.commit()
            except Exception:
                pass
