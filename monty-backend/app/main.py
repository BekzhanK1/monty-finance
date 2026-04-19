from contextlib import asynccontextmanager

from app.core.config import Base, engine
from app.finance.routers import (
    analytics,
    auth,
    budgets,
    categories,
    digest,
    goals,
    settings,
    transactions,
)
from app.finance.services.scheduler import scheduler, setup_scheduler
from app.food.db_bootstrap import ensure_food_dish_columns
from app.food.router import router as food_router
import app.models  # noqa: F401 — register all ORM tables on Base.metadata
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_food_dish_columns()

    setup_scheduler()
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(
    title="Monty API",
    version="1.0.0",
    description="Financial tracker API for couple",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(digest.router)
app.include_router(settings.router)
app.include_router(analytics.router)
app.include_router(food_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Monty API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
