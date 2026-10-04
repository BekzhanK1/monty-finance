import os
import tempfile
from pathlib import Path

# Must run before `app` is imported: the engine is built from settings at import time.
_DB_PATH = Path(tempfile.mkdtemp()) / "test.db"
os.environ["STAGE"] = "DEV"
os.environ["DEV_DATABASE_URL"] = f"sqlite:///{_DB_PATH}"
os.environ["OPENAI_API_KEY"] = "test"

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.config import SessionLocal, engine
from app.core.migrations import run_migrations
from app.finance.models import Category, CategoryGroup, Transaction, TransactionType, User


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    run_migrations()
    yield
    engine.dispose()


@pytest.fixture
def db():
    session = SessionLocal()
    from app.food.models import (
        FoodDish, FoodDishIngredient, FoodIngredient, FoodMealCategory, FoodMealSlot,
        FoodPantryItem, FoodShoppingItem, FoodShoppingList, FoodStockMovement, FoodStockTransfer,
        FoodStockTransferLine, FoodWarehouse,
    )
    for model in (FoodStockMovement, FoodStockTransferLine, FoodStockTransfer, FoodShoppingItem, FoodShoppingList,
                  FoodPantryItem, FoodWarehouse, FoodMealSlot, FoodDishIngredient, FoodDish, FoodMealCategory,
                  FoodIngredient):
        session.query(model).delete()
    session.query(Transaction).delete()
    session.query(Category).delete()
    session.query(User).delete()
    session.add(User(id=1, telegram_id=111, first_name="Аня", is_active=True, household_id=1))
    session.add_all([
        Category(id=1, name="Продукты", group=CategoryGroup.BASE, type=TransactionType.EXPENSE, icon="🛒"),
        Category(id=2, name="Транспорт", group=CategoryGroup.BASE, type=TransactionType.EXPENSE, icon="🚕"),
        Category(id=3, name="Зарплата", group=CategoryGroup.INCOME, type=TransactionType.INCOME, icon="💰"),
    ])
    session.commit()
    yield session
    session.close()


@pytest.fixture
def client(db, monkeypatch):
    from app.core.config import get_db
    from app.main import app
    from app.middleware.auth import get_current_user

    def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = lambda: db.get(User, 1)
    monkeypatch.setattr("app.finance.routers.transactions.send_transaction_notification", lambda **_: True)
    monkeypatch.setattr("app.finance.routers.integrations.send_transaction_notification", lambda **_: True)
    yield TestClient(app)
    app.dependency_overrides.clear()


class FakeOpenAI:
    """Records calls and returns canned chat / transcription responses."""

    def __init__(self, payload: dict | None = None, transcript: str = ""):
        self.payload = payload or {}
        self.transcript = transcript
        self.chat_prompts: list[str] = []
        self.transcribed: list[tuple] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._chat))
        self.audio = SimpleNamespace(transcriptions=SimpleNamespace(create=self._transcribe))

    def _chat(self, **kwargs):
        self.chat_prompts.append(kwargs["messages"][-1]["content"])
        content = json.dumps(self.payload) if kwargs.get("response_format") else "Записал!"
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    def _transcribe(self, **kwargs):
        self.transcribed.append(kwargs["file"])
        return SimpleNamespace(text=self.transcript)


@pytest.fixture
def fake_openai(monkeypatch):
    fake = FakeOpenAI()
    monkeypatch.setattr("app.finance.services.expense_parser.get_openai_client", lambda: fake)
    monkeypatch.setattr("app.finance.services.siri_expense_service.get_openai_client", lambda: fake)
    return fake
