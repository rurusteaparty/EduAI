"""
Automated tests — pytest + pytest-asyncio
Run: cd backend && pytest ../tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

BASE = "/api/v1"

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture
async def auth_headers(client):
    await client.post(f"{BASE}/auth/register", json={
        "email": "test@example.com", "username": "testuser",
        "password": "testpass123", "full_name": "Test User",
    })
    r = await client.post(f"{BASE}/auth/login", json={"email": "test@example.com", "password": "testpass123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_register(client):
    r = await client.post(f"{BASE}/auth/register", json={
        "email": "new@example.com", "username": "newuser", "password": "password123",
    })
    assert r.status_code == 201
    assert "access_token" in r.json()

@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(f"{BASE}/auth/register", json={"email": "bad@example.com", "username": "baduser", "password": "password123"})
    r = await client.post(f"{BASE}/auth/login", json={"email": "bad@example.com", "password": "wrong"})
    assert r.status_code == 401

@pytest.mark.asyncio
async def test_get_me(client, auth_headers):
    r = await client.get(f"{BASE}/auth/me", headers=auth_headers)
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_create_chat_session(client, auth_headers):
    r = await client.post(f"{BASE}/chat/sessions", json={"title": "Test"}, headers=auth_headers)
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_quiz_attempts_history_not_shadowed(client, auth_headers):
    # Verifies route order bug fix: /attempts/history not captured by /{quiz_id}
    r = await client.get(f"{BASE}/quiz/attempts/history", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

@pytest.mark.asyncio
async def test_get_flashcard_decks(client, auth_headers):
    r = await client.get(f"{BASE}/flashcards/decks", headers=auth_headers)
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_upload_empty_file_rejected(client, auth_headers):
    r = await client.post(f"{BASE}/documents/upload",
        files={"file": ("empty.txt", b"", "text/plain")}, headers=auth_headers)
    assert r.status_code == 400
